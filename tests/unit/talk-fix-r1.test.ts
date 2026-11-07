// '회화 AI 몫 넓힘' 대본 회차 r1 설계 판정(task-des-r1-report.md) fix 라운드 1 — Important 여섯 · Minor 를 근거 차례의 글로 가른다(순수 함수).
// 서버 · 대본 도구를 함께 돌리는 시나리오는 talk-observe-parity.test.ts 의 '대본 회차 r1 판정 fix 1' 절이다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  emptyToriEnStuckOf,
  normalizeTalkLesson,
  TALK_SITUATION_EXAMPLES,
  type TalkCallTurn,
  talkCallTurnOf,
  talkLessonInvalidReasonOf,
  talkLessonSystem,
  talkLessonTurnSpec,
  talkLessonUserMessage,
} from "@/core/ai/calls/talk-lesson";
import {
  effectiveStuckOf,
  sceneWordsOf,
  touchesScene,
} from "@/core/conversation/child-kind";
import { soundLinePlacesOf } from "@/core/conversation/cue-line";
import {
  childAnsweredRequiredOf,
  childLinesOf,
  type LessonArgs,
  nextTeacherTurnOf,
  type TeacherTurnPlan,
  teacherTurnPlansOf,
} from "@/core/conversation/lesson-flow";
import type { TalkLessonTurn } from "@/core/conversation/lesson-turns";
import { TALK_SUPPORT_STAGE_MAX } from "@/core/conversation/move";
import {
  checkLowLevelQuestion,
  type LowLevelLineOptions,
  questionEchoesChild,
} from "@/core/conversation/question-check";
import {
  keepLastHeldQuestion,
  questionRetryNoteOf,
  type RetrySentence,
} from "@/core/conversation/question-retry";
import {
  checkSituationSentence,
  echoesTurnSentence,
  failSituationLineOf,
  failSituationPlaceOf,
  isShortReaction,
  SHORT_REACTION_MAX_WORDS,
  type SituationCheckContext,
  situationExampleOf,
  situationLineOf,
  situationRotationOf,
  situationTailOf,
} from "@/core/conversation/situation";
import { TALK_NEXT_MOVES } from "@/core/seed/structure";
import { splitSentences } from "@/core/seed/text";
import { soundOutsideOf } from "../../scripts/talk-metrics";
import { filledFieldsOf, type TurnRecord } from "../../scripts/talk-observe";
import {
  lemmaOf,
  lessonInput,
  lessonRules,
} from "../fixtures/ai/talk-lesson-inputs";
import {
  button,
  CARD3,
  CARD4,
  LOW,
  MID,
  NEW3,
  NEW4,
  opening3,
  SPEC3,
  SPEC4,
  said,
  teacher,
} from "../fixtures/talk-lesson";

/** 3단계 단원 1 수업 1 시드 카드(대본 회차 r1 이 돌린 카드 — 근거 차례의 필수 질문 · 답 예시). */
const SEED_CARD = (() => {
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), "seed/lessons/talk/3/1.json"), "utf8"),
  ) as {
    lessons: {
      card: {
        required: {
          no: number;
          en: string;
          targets: string[];
          answerExample: string;
        }[];
      };
    }[];
  };
  const card = raw.lessons[0]?.card;
  if (!card) throw new Error("시드 카드 없음");
  return card;
})();

function flow3(turns: TalkLessonTurn[]): LessonArgs {
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

function flow4(turns: TalkLessonTurn[]): LessonArgs {
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

function callOf(
  plan: TeacherTurnPlan,
  over: { exampleTurn?: number; ifStuck?: TeacherTurnPlan | null } = {},
): TalkCallTurn {
  return talkCallTurnOf({
    plan,
    ifStuck: over.ifStuck ?? null,
    child: "",
    input: over.ifStuck ? "speech" : "dont_know",
    hintKind: "none",
    hintTier: 0,
    heardHelp: "none",
    ...(over.exampleTurn === undefined
      ? {}
      : { exampleTurn: over.exampleTurn }),
  });
}

/** 낱말 범위를 넓게 둔 질문 · 상황 검사 재료(범위 밖 걸림을 빼고 되묻기 · 되풀이만 본다). */
function wideOptions(words: readonly string[]): LowLevelLineOptions {
  return {
    sentenceMaxWords: 12,
    allowedWords: new Set(words.map((w) => w.toLowerCase())),
    unitWords: [],
    childWords: [],
    teacherName: "Mina",
    lemmaOf: () => undefined,
    forms: [],
    allowedForms: new Set(),
  };
}

const WIDE_WORDS =
  "a an the i you it we is am are do does what who where or like fish big small lake rice juice cold hot oh wow yes yum good to hear let's let learn some new words that's okay that no problem can help here easy one tired sorry ears my oops go on".split(
    " ",
  );

function situationCtx(
  over: Partial<SituationCheckContext> = {},
): SituationCheckContext {
  return {
    place: "together",
    options: wideOptions(WIDE_WORDS),
    allowed: new Set(),
    forbidden: { all: [], nospeech: [] },
    answer: null,
    ...over,
  };
}

describe("I-1 (가) 상황 차례 예는 고정부 목록이 아니라 사용자 메시지에 그 자리 예 하나(차례마다 돌림)", () => {
  const plan = nextTeacherTurnOf(flow3([...opening3(), button()]));

  it("받침 첫째 계획의 사용자 메시지에 예가 한 줄이고, 돌림 번호마다 셋 가운데 다른 예다", () => {
    expect(plan.stage).toBe(1);
    const lines = [0, 1, 2].map((n) =>
      talkLessonUserMessage(callOf(plan, { exampleTurn: n }))
        .split("\n")
        .filter((l) => l.startsWith("Example line")),
    );
    for (const [n, found] of lines.entries()) {
      expect(found).toHaveLength(1);
      expect(found[0]).toContain(
        `'${TALK_SITUATION_EXAMPLES.together[n] ?? "?"}'`,
      );
      // 지금 자리를 함께 알린다(판정 r1 M-1 — 받침 둘째 예를 첫째에 씀)
      expect(found[0]).toContain("Support stage 1");
    }
    expect(new Set(lines.map((l) => l[0])).size).toBe(3);
  });

  it("돌림 번호를 넘기지 않으면 예 줄이 없고, 4단계 계획은 돌림 번호가 있어도 없다(4단계 사용자 메시지 불변)", () => {
    expect(talkLessonUserMessage(callOf(plan))).not.toContain("Example line");
    const four = nextTeacherTurnOf(
      flow4([
        teacher("Hi! How was your day?", { kind: "first_question" }),
        said({ segment: "greeting_end" }),
        teacher("Nice! Let's talk.", { kind: "ai" }),
        teacher("What is your favorite subject?", {
          kind: "first_question",
          item: { kind: "required", no: 1 },
          words: ["math"],
        }),
        button(),
      ]),
    );
    expect(
      talkLessonUserMessage(callOf(four, { exampleTurn: 1 })),
    ).not.toContain("Example line");
  });

  it("말 입력 턴은 막혔다고 볼 때의 계획에도 그 자리 예가 붙는다('If stuck, Example line')", () => {
    const { ifAnswered, ifStuck } = teacherTurnPlansOf(flow3(opening3()), {
      segment: "talk",
      targets: ["play"],
    });
    const message = talkLessonUserMessage(
      callOf(ifAnswered, { exampleTurn: 2, ifStuck }),
    );
    expect(message).toContain(
      `If stuck, Example line (Support stage 1: an okay reaction and a short cheer; only the kind of line, never copy it): '${TALK_SITUATION_EXAMPLES.together[2]}'`,
    );
    // 대화 토막 AI 차례 자체는 상황 차례가 아니라 예가 없다
    expect(
      message.split("\n").filter((l) => l.startsWith("Example line")),
    ).toEqual([]);
  });

  it("인사 끝 예는 다음 토막으로 고르고, 1~3단계 고정부에는 예 목록이 없다", () => {
    expect(situationExampleOf("greeting_end", 0, "prep")).toBe(
      TALK_SITUATION_EXAMPLES.greetingEndPrep[0],
    );
    expect(situationExampleOf("greeting_end", 4, "talk")).toBe(
      TALK_SITUATION_EXAMPLES.greetingEndTalk[1],
    );
    const system = talkLessonSystem(lessonInput(3), lessonRules(3));
    // 근거: 인사 끝 21/24 가 목록 첫째 'Good to hear! Let's learn some new words!' 그대로였다
    expect(system).not.toContain("'Good to hear! Let's learn some new words!'");
    expect(system).not.toContain("'Oops, my ears! Let's go on.'");
    expect(system).toContain("The app changes a copied or repeated line.");
  });
});

describe("I-1 (나) · M-6 상황 차례의 예 베끼기 · 되풀이 걸림과 대화마다 다른 돌림", () => {
  it("이 대화에서 이미 한 말과 같은 문장은 repeat, 예 문장 그대로는 copy 로 걸리고 자기 말은 지난다(stuck-three L1 2 · 5 · 7 · 인사 끝 21/24)", () => {
    const spoken = ["That's okay! You can do it! Listen, then say it with me!"];
    const ctx = situationCtx({ repeat: { spoken } });
    expect(checkSituationSentence("That's okay!", ctx)).toEqual({
      ok: false,
      reason: "repeat",
    });
    expect(checkSituationSentence("You can do it!", ctx)).toEqual({
      ok: false,
      reason: "repeat",
    });
    const greeting = situationCtx({
      place: "greeting_end",
      repeat: { spoken: [] },
    });
    // [N-1] 맞장구 한 문장('Good to hear!' · 'No problem!')은 예와 같아도 걸지 않고, 넘김 문장만 copy 로 건다(대본 회차 r2 판정 N-1 (가)(나))
    expect(checkSituationSentence("Good to hear!", greeting)).toEqual({
      ok: true,
    });
    expect(
      checkSituationSentence("Let's learn some new words!", greeting),
    ).toEqual({ ok: false, reason: "copy" });
    expect(checkSituationSentence("No problem!", ctx)).toEqual({ ok: true });
    expect(checkSituationSentence("Here is an easy one.", ctx)).toEqual({
      ok: false,
      reason: "copy",
    });
    // 아이 말을 받은 자기 말은 지난다
    expect(checkSituationSentence("Oh, tired!", greeting)).toEqual({
      ok: true,
    });
    expect(checkSituationSentence("Oh, fish!", ctx)).toEqual({ ok: true });
  });

  it("되풀이 재료가 없으면 예 문장도 지난다(4단계 · 옛 길 — 서버 · 도구는 늘 켠다)", () => {
    expect(checkSituationSentence("That's okay!", situationCtx())).toEqual({
      ok: true,
    });
  });

  it("돌림 번호는 열쇠가 비면 턴 번호 그대로이고, 같은 열쇠는 같은 수 · 다른 대화는 다른 자리에서 시작할 수 있다(nospeech L1 5 · L2 5 같은 줄)", () => {
    expect(situationRotationOf(5, "")).toBe(5);
    expect(situationRotationOf(5, "l3-nospeech#1")).toBe(
      situationRotationOf(5, "l3-nospeech#1"),
    );
    const starts = new Set(
      ["l3-nospeech#1", "l3-nospeech#2", "a", "b", "c"].map(
        (key) => situationRotationOf(5, key) % 4,
      ),
    );
    expect(starts.size).toBeGreaterThan(1);
  });
});

describe("I-2 아이가 먼저 말한 필수 질문 답은 남은 기회에서 뺀다(greet-more L2 3 · second-session L2 3 · scene-other)", () => {
  const required = SEED_CARD.required;

  it("노리는 단어와 답 예시의 다른 내용 낱말을 함께 담은 아이 말이 그 필수 질문의 답이다", () => {
    expect(
      childAnsweredRequiredOf({
        required,
        childLines: ["We eat rice and fish."],
        lemmaOf,
      }),
    ).toEqual([1]);
    expect(
      childAnsweredRequiredOf({
        required,
        childLines: [
          "Yes, I like it.",
          "I drink the juice.",
          "We go to the lake.",
        ],
        lemmaOf,
      }),
    ).toEqual([2, 3]);
    // 뜻이 다르면(주스가 아니라 물) · 노리는 단어만 · 한 낱말은 아니다
    expect(
      childAnsweredRequiredOf({
        required,
        childLines: ["I drink water.", "I eat.", "Rice."],
        lemmaOf,
      }),
    ).toEqual([]);
  });

  it("흐름은 아이가 먼저 답한 필수 질문을 기회 알림 · 카드 자리 후보에서 뺀다(없으면 그대로)", () => {
    const args = flow3([...opening3(), said()]);
    const before = nextTeacherTurnOf(args).chances.required.map((r) => r.no);
    expect(before).toContain(2);
    const after = nextTeacherTurnOf({ ...args, childAnswered: [2] });
    expect(after.chances.required.map((r) => r.no)).toEqual(
      before.filter((no) => no !== 2),
    );
    expect(
      talkLessonUserMessage(callOf(after)).match(/Chances, required.*$/m)?.[0],
    ).not.toContain("2 (aims at");
  });

  it("아이 말 목록은 글 있는 아이 행 뒤에 이번 말이다(모름 · 빈 글은 뺀다)", () => {
    expect(
      childLinesOf(
        [
          { speaker: "teacher", text: "Hi!" },
          { speaker: "child", text: "I am fine." },
          { speaker: "child", text: "" },
        ],
        "We eat rice and fish.",
      ),
    ).toEqual(["I am fine.", "We eat rice and fish."]);
    expect(childLinesOf([], null)).toEqual([]);
  });
});

describe("I-3 응답을 읽지 못한 까닭과 대신 줄의 자리(word-answers L1 7 · L2 2 · stuck-three L2 5)", () => {
  it("읽지 못한 까닭을 가린다(JSON 객체 아님 · 칸 꼴 · tori_en 빔), 읽을 수 있으면 null", () => {
    expect(talkLessonInvalidReasonOf(null)).toBe("not_json_object");
    expect(talkLessonInvalidReasonOf(["x"])).toBe("not_json_object");
    expect(talkLessonInvalidReasonOf({ stuck: false })).toBe(
      "field:tori_en:invalid_type",
    );
    expect(talkLessonInvalidReasonOf({ tori_en: "", tori_ko: [] })).toBe(
      "tori_en_empty",
    );
    expect(
      talkLessonInvalidReasonOf({ tori_en: "Wow!", tori_ko: [] }),
    ).toBeNull();
    // 뜻 칸이 아예 없는 응답도 칸 꼴로 걸린다(정규화가 null 을 내는 자리)
    expect(talkLessonInvalidReasonOf({ tori_en: "Wow!" })).toBe(
      "field:tori_ko:invalid_type",
    );
  });

  it("응답 규격(구조화 출력)을 지난 응답이 읽지 못함이 되는 길은 tori_en 빈 글뿐이다(r1 · medium 6/308 이 모두 stuck 참 · 출력 246~306 토큰 — 거의 빈 칸 꼴)", () => {
    const input = lessonInput(3);
    const skeleton = {
      child_kind: "unrelated_words",
      stuck: true,
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
    };
    expect(
      talkLessonTurnSpec.wireSchema(input, lessonRules(3)).safeParse(skeleton)
        .success,
    ).toBe(true);
    // 막힘(stuck 참) + 빈 tori_en 은 1~3단계에서 반응 지워진 막힘 차례로 받는다(컨트롤러 결정 2026-11-07), 막힘이 아니면 · 4단계는 읽지 못함
    expect(emptyToriEnStuckOf(skeleton, false)).toBe(true);
    expect(emptyToriEnStuckOf(skeleton, true)).toBe(false);
    expect(emptyToriEnStuckOf({ ...skeleton, stuck: false }, false)).toBe(
      false,
    );
    // 견본 아이 말 'I play soccer.'(세 낱말)은 앱이 막힘을 무른다 — 값은 받고 막힘은 거짓(서버는 지금 무름 길로 잡아 두고 다시 쓰게 한다)
    expect(normalizeTalkLesson(skeleton, input, lessonRules(3))).toMatchObject({
      stuck: false,
      tori_en: "",
    });
    const huh = lessonInput(3, { turn: { child: "Huh?" } });
    expect(normalizeTalkLesson(skeleton, huh, lessonRules(3))).toMatchObject({
      stuck: true,
      tori_en: "",
    });
    expect(
      normalizeTalkLesson({ ...skeleton, stuck: false }, input, lessonRules(3)),
    ).toBeNull();
    expect(
      normalizeTalkLesson(skeleton, lessonInput(4), lessonRules(4)),
    ).toBeNull();
    expect(talkLessonInvalidReasonOf(skeleton)).toBe("tori_en_empty");
    // 엄격 규격은 지나고 앱 확인 검사가 빈 tori_en 을 건다 — r1 기록의 판정 'invalid'(엄격 길 밖)와 맞다
    expect(
      talkLessonTurnSpec.validate(skeleton as never, input, lessonRules(3)),
    ).toContain("tori_en 이 비었다");
    expect(filledFieldsOf(skeleton)).toBe(
      'child_kind="unrelated_words" stuck=true',
    );
    expect(filledFieldsOf("x")).toBe("-");
  });

  it("상황 차례가 아닌 1~3단계 실패는 아이 말이 모름 꼴('Huh?')일 때만 쉬운 질문 자리 상황 줄, 그 밖은 안전한 대사(null)", () => {
    const ai = {
      lowBand: true as const,
      segment: "talk" as const,
      cause: null,
      stage: 0,
    };
    expect(failSituationPlaceOf(ai, "Huh?")).toBe("easy");
    expect(failSituationPlaceOf(ai, "I don't know.")).toBe("easy");
    expect(failSituationPlaceOf(ai, "Big.")).toBeNull();
    expect(failSituationPlaceOf(ai, null)).toBeNull();
    // 상황 차례는 그 자리 그대로, 4단계는 없다
    expect(
      failSituationPlaceOf(
        { ...ai, cause: "button", stage: TALK_SUPPORT_STAGE_MAX },
        null,
      ),
    ).toBe("close");
    expect(
      failSituationPlaceOf({ segment: "talk", cause: null, stage: 0 }, "Huh?"),
    ).toBeNull();
  });
});

describe("I-4 한 낱말 장면 말은 막힘이 아니다(word-answers L1 2 'Rice.' — 13절 C204 (2))", () => {
  const scene = sceneWordsOf([
    "Bikes and ducks at the lake! Do you ride a bike?",
    "Rice and fish for lunch! What do you do at the table?",
    "We eat rice and fish.",
  ]);

  it("AI 가 관계없는 낱말(막힘)이라 해도 장면 · 카드 낱말 하나면 앱이 막힘을 무른다", () => {
    expect(touchesScene("Rice.", scene)).toBe(true);
    expect(
      effectiveStuckOf({
        aiStuck: true,
        childKind: "unrelated_words",
        child: "Rice.",
        input: "speech",
        sceneWords: scene,
      }),
    ).toBe(false);
  });

  it("장면 밖 한 낱말 · 모름 말 · 대답 말은 갈래대로 막힘이다", () => {
    for (const child of ["Car.", "Huh?", "What?"])
      expect(
        effectiveStuckOf({
          aiStuck: true,
          childKind: "unrelated_words",
          child,
          input: "speech",
          sceneWords: scene,
        }),
        child,
      ).toBe(true);
  });

  it("1~3단계 고정부도 한 낱말 장면 말을 막힘으로 보지 않게 적는다", () => {
    expect(talkLessonSystem(lessonInput(3), lessonRules(3))).toContain(
      "Levels 1-3: one word that answers or describes what you just said or asked, or a word from today's scene or the card (e.g. 'Rice.', 'Big.', 'Juice.'), is answer or short_related and never stuck",
    );
  });
});

describe("I-5 소리 줄 자리는 정규화와 지표가 같은 함수(word-answers L2 8 — 필수 질문 차례의 〈I wash my hands.〉)", () => {
  /** 지표 기록 꼴(소리 줄 · 받침 단계 · 갈래 · 들리지 않음만). */
  function record(
    over: {
      stage: number;
      next: TurnRecord["move"]["next"];
      nospeech: boolean;
    },
    sound: TurnRecord["sound"],
  ): TurnRecord {
    return {
      move: { stage: over.stage, next: over.next },
      sound,
      techError: over.nospeech ? { nospeech: true, call: null } : null,
    } as unknown as TurnRecord;
  }

  it("짝: 모든 받침 단계 · 갈래 · 들리지 않음 · 고르기 단계에서 지표의 자리 밖 셈이 core 자리 함수와 같다", () => {
    for (const stage of [0, 1, 2, 3])
      for (const next of TALK_NEXT_MOVES)
        for (const nospeech of [false, true])
          for (const level of [1, 3]) {
            const places = soundLinePlacesOf({
              stage,
              nospeech,
              next,
              choicesLevel: level === 1,
            });
            const key = JSON.stringify({ stage, next, nospeech, level });
            expect(
              soundOutsideOf(
                record(
                  { stage, next, nospeech },
                  { model: "I wash my hands." },
                ),
                level,
              ),
              key,
            ).toBe(places.model ? 0 : 1);
            expect(
              soundOutsideOf(
                record(
                  { stage, next, nospeech },
                  { choices: ["It is red.", "It is blue."] },
                ),
                level,
              ),
              key,
            ).toBe(places.choices ? 0 : 1);
            expect(
              soundOutsideOf(
                record({ stage, next, nospeech }, { answer: "We go home." }),
                level,
              ),
              key,
            ).toBe(places.answer ? 0 : 1);
          }
  });

  it("필수 질문 · 이어 묻기 차례는 꺼낼 새 단어를 담은 따라 할 말도 버리고, 꺼내기 갈래만 남긴다", () => {
    expect(
      soundLinePlacesOf({
        stage: 0,
        nospeech: false,
        next: "required",
        choicesLevel: false,
      }).model,
    ).toBe(false);
    const base = {
      child_kind: "answer",
      stuck: false,
      tori_en: "Sand on your hands! What do you do on the weekend?",
      model_line: "I wash my hands.",
      choices: [],
      tori_ko: ["손에 모래!", "주말에 뭐 해?"],
      recast: "",
      explanation: "",
      new_words: ["wash"],
      self_used_words: [],
      mission_done: [],
      response_fit: true,
      child_topic: false,
      child_asked: false,
      goal_suggest: [],
      next_move: "required",
      card_item: { kind: "required", no: 2 },
      next_goal: [],
      support: "model_line",
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
    };
    const input = lessonInput(3, {
      turn: {
        chances: {
          carry: { goals: [], words: [] },
          required: [{ no: 2, targets: ["wash"] }],
          reuse: [],
          introduce: ["wash", "weekend"],
        },
      },
    });
    expect(normalizeTalkLesson(base, input, lessonRules(3))?.model_line).toBe(
      "",
    );
    // 범위 안 따라 할 말(대체 글 길과 가르게)도 필수 질문 갈래면 버린다
    const inRange = {
      ...base,
      tori_en: "The weekend is fun! What do you do on the weekend?",
      model_line: "The weekend.",
      new_words: ["weekend"],
    };
    expect(
      normalizeTalkLesson(inRange, input, lessonRules(3))?.model_line,
    ).toBe("");
    expect(
      normalizeTalkLesson(
        {
          ...inRange,
          next_move: "follow_up",
          card_item: { kind: "none", no: 0 },
        },
        input,
        lessonRules(3),
      )?.model_line,
    ).toBe("");
    expect(
      normalizeTalkLesson(
        { ...base, next_move: "follow_up", card_item: { kind: "none", no: 0 } },
        input,
        lessonRules(3),
      )?.model_line,
    ).toBe("");
    // 꺼내기 갈래(대조군)는 남는다
    expect(
      normalizeTalkLesson(
        {
          ...base,
          tori_en: "The weekend is fun! What do you do on the weekend?",
          model_line: "The weekend.",
          new_words: ["weekend"],
          next_move: "introduce",
          card_item: { kind: "none", no: 0 },
        },
        input,
        lessonRules(3),
      )?.model_line,
    ).toBe("The weekend.");
  });
});

describe("I-6 아이 말을 되묻는 질문은 질문 검사에 걸린다(word-answers L2 7 · preview-1 L1 7)", () => {
  it("고르기 질문의 'or' 양옆이 아이의 이번 말 · 예 · 아니요 질문의 내용 낱말이 모두 아이의 한 말에 있으면 되묻기다", () => {
    expect(
      questionEchoesChild(
        "Is the lake big or small?",
        ["Yes.", "Big."],
        () => undefined,
      ),
    ).toBe(true);
    expect(
      questionEchoesChild(
        "Do you like the fish?",
        ["Yes I like fish.", "We eat rice and fish.", "Yes big fish."],
        () => undefined,
      ),
    ).toBe(true);
  });

  it("새 것을 묻는 질문은 되묻기가 아니다(대조군 — 같은 대본의 다른 차례)", () => {
    const none = () => undefined;
    expect(
      questionEchoesChild("Do you like cold juice?", ["Cold."], none),
    ).toBe(false);
    expect(
      questionEchoesChild(
        "Is the juice cold or hot?",
        ["I drink the juice."],
        none,
      ),
    ).toBe(false);
    expect(
      questionEchoesChild("Do you like it?", ["Yes I like fish."], none),
    ).toBe(false);
    expect(
      questionEchoesChild("Who do you go with?", ["We go to the lake."], none),
    ).toBe(false);
    expect(
      questionEchoesChild(
        "Do you ride with your family?",
        ["Yes, I like it."],
        none,
      ),
    ).toBe(false);
    expect(questionEchoesChild("Do you like the fish?", [], none)).toBe(false);
  });

  it("질문 검사는 아이 말 목록을 받으면 echo 로 걸고, 받지 않으면 보지 않는다 · 다시 쓰기 안내에 까닭이 든다", () => {
    const options = wideOptions(WIDE_WORDS);
    const question = "Is the lake big or small?";
    expect(
      checkLowLevelQuestion(question, {
        ...options,
        childLines: ["Big."],
        targets: [],
      }),
    ).toEqual({ ok: false, reason: "echo" });
    expect(
      checkLowLevelQuestion(question, { ...options, targets: [] }),
    ).toEqual({ ok: true });
    const note = questionRetryNoteOf(
      { question, reason: "echo", words: [] },
      { sentenceMaxWords: 8, targets: [], childWords: ["big"] },
    );
    expect(note).toContain(
      "because it asked again about what the child already told you",
    );
  });
});

describe("Minor — 고정부 · 다시 쓰기 안내 줄(M-2 · M-3 · M-4 · M-7)", () => {
  const system = talkLessonSystem(lessonInput(3), lessonRules(3));

  it("M-3 장면 줄을 아이 상태 단정으로 바꾸지 않음 · M-4 장면 다리 앞 반응 한 문장 · M-7 무엇 · 누구 · 어디 질문 먼저", () => {
    expect(system).toContain(
      "never turn it into a fact about the child (not 'Sand is on your hands.')",
    );
    expect(system).toContain(
      "When you set the scene before a card question, keep the reaction to one short sentence.",
    );
    expect(system).toContain("prefer what, who and where questions");
    expect(talkLessonSystem(lessonInput(4), lessonRules(4))).not.toContain(
      "prefer what, who and where questions",
    );
  });

  it("M-2 길이로 걸린 다시 쓰기는 구조를 두라는 줄이 붙고, 다른 까닭에는 없다 · M-7 줄은 늘 든다", () => {
    const ctx = { sentenceMaxWords: 6, targets: [], childWords: [] };
    const long = questionRetryNoteOf(
      {
        question: "Do you go to the lake with your family?",
        reason: "too_long",
        words: [],
      },
      ctx,
    );
    expect(long).toContain(
      "keep a whole question that makes sense (not 'Is the lake with your family?')",
    );
    expect(long).toContain("Prefer a what, who or where question");
    const off = questionRetryNoteOf(
      {
        question: "What about the juice?",
        reason: "offband",
        words: ["about"],
      },
      ctx,
    );
    expect(off).not.toContain("keep a whole question");
    expect(off).toContain("Prefer a what, who or where question");
  });
});

describe("fix 2 — 대본 회차 r2 재판정 N-1 · N-2 · N-3 · M-r2-1(근거 차례의 글)", () => {
  it("[N-1] 맞장구 한 문장은 넘김 낱말 없이 네 낱말 안이고, 넘김 문장(시작 · 다음으로)은 짧아도 맞장구가 아니다", () => {
    for (const s of [
      "Good to hear!",
      "That's okay!",
      "No problem!",
      "Yummy!",
      "Apples are yummy!",
      "I am happy too.",
    ])
      expect(isShortReaction(s), s).toBe(true);
    for (const s of [
      "Let's learn some new words!",
      "Let's talk!",
      "Try this one.",
      "New words time!",
      "Here is an easy one.",
      "You can do it with me.",
    ])
      expect(isShortReaction(s), s).toBe(false);
  });

  it("[N-1] 상황 줄은 AI 맞장구가 남은 턴에 맞장구를 떼고 넘김만 붙인다(뜻도 같은 자리), 맞장구가 없으면 줄 그대로", () => {
    const line = { en: "Nice! Here we go!", ko: "좋아! 자, 가 보자!" };
    expect(situationTailOf(line, true)).toEqual({
      en: "Here we go!",
      ko: "자, 가 보자!",
    });
    expect(situationTailOf(line, false)).toEqual(line);
    expect(
      situationTailOf({ en: "Let's start!", ko: "시작하자!" }, true),
    ).toEqual({ en: "Let's start!", ko: "시작하자!" });
    // 뜻 문장 수가 다르면 줄 그대로(뜻을 어긋나게 떼지 않음)
    expect(
      situationTailOf({ en: "Nice! Here we go!", ko: "좋아, 가 보자!" }, true),
    ).toEqual({ en: "Nice! Here we go!", ko: "좋아, 가 보자!" });
  });

  it("[N-1] 시드: 인사 끝 줄에 'Hmm, okay!' 꼴이 없고 모두 넘김을 담으며, 'yummy' 가 허용 낱말이라 'Apples are yummy!' 가 3단계 상황 검사를 지난다", () => {
    const lists = JSON.parse(
      readFileSync(
        join(process.cwd(), "seed/lists/talk-situation-lines.json"),
        "utf8",
      ),
    ) as { lines: Record<string, { en: string }[]> };
    const greeting = (lists.lines.greeting_end ?? []).map((l) => l.en);
    expect(greeting.some((en) => /hmm/i.test(en))).toBe(false);
    for (const en of greeting)
      expect(
        splitSentences(en).some((s) => !isShortReaction(s)),
        en,
      ).toBe(true);
    const allowed = JSON.parse(
      readFileSync(
        join(process.cwd(), "seed/lists/talk-allowed-words.json"),
        "utf8",
      ),
    ) as { allowed: string[] };
    expect(allowed.allowed).toContain("yummy");
    expect(
      checkSituationSentence(
        "Apples are yummy!",
        situationCtx({
          place: "greeting_end",
          options: wideOptions(["apples", "are", "apple"]),
          allowed: new Set(allowed.allowed),
          repeat: { spoken: [] },
        }),
      ),
    ).toEqual({ ok: true });
  });

  it("[N-2] 시드 받침 첫째 줄에 r1 의 'That's okay! You can do it!' 이 없다 · 같은 턴의 같은 뜻 문장('You can do it! You can do it with me.')을 가린다", () => {
    const lists = JSON.parse(
      readFileSync(
        join(process.cwd(), "seed/lists/talk-situation-lines.json"),
        "utf8",
      ),
    ) as { lines: Record<string, { en: string }[]> };
    expect((lists.lines.together ?? []).map((l) => l.en)).not.toContain(
      "That's okay! You can do it!",
    );
    expect(
      echoesTurnSentence("You can do it with me.", [
        "That's okay!",
        "You can do it!",
      ]),
    ).toBe(true);
    expect(echoesTurnSentence("Let's try.", ["That's okay!"])).toBe(false);
    expect(echoesTurnSentence("Oh, rice!", ["Yum!"])).toBe(false);
  });

  it("[N-2] 상황 줄 고르기는 앞 선생님 행에 나온 문장을 담은 줄을 건너뛴다(모두 걸리면 돌림 줄)", () => {
    const lines = {
      close: [
        { en: "That's okay! Let's go on.", ko: "괜찮아! 계속하자." },
        { en: "No problem! Here is the answer.", ko: "괜찮아! 답은 이거야." },
      ],
    };
    expect(
      situationLineOf(lines, "close", 0, {
        texts: ["That's okay! You can do it!"],
      })?.en,
    ).toBe("No problem! Here is the answer.");
    expect(
      situationLineOf(lines, "close", 0, {
        texts: ["That's okay!", "No problem!"],
      })?.en,
    ).toBe("That's okay! Let's go on.");
  });

  it("[N-3] 무엇을 하느냐 질문이 노리는 단어를 아이가 방금 말했으면 되묻기다(stuck-three L1 6 'I drink juice.' → 'What do you do with the juice?')", () => {
    const none = () => undefined;
    expect(
      questionEchoesChild(
        "What do you do with the juice?",
        ["I drink juice."],
        none,
        ["drink"],
      ),
    ).toBe(true);
    // 대조군: 그 낱말을 넣어 다른 것을 묻는 질문(같은 대본 L2 6) · 무엇을 하느냐 꼴이 아닌 질문 · 아이가 말하지 않은 노림
    expect(
      questionEchoesChild(
        "What juice do you drink?",
        ["I drink juice."],
        none,
        ["drink"],
      ),
    ).toBe(false);
    expect(
      questionEchoesChild(
        "Who is at the table with you?",
        ["We eat rice."],
        none,
        ["eat"],
      ),
    ).toBe(false);
    expect(
      questionEchoesChild(
        "What do you do at the lake?",
        ["I drink juice."],
        none,
        ["go"],
      ),
    ).toBe(false);
    const note = questionRetryNoteOf(
      {
        question: "What else do you drink?",
        reason: "offband",
        words: ["else"],
      },
      {
        sentenceMaxWords: 8,
        targets: ["drink"],
        childWords: ["drink", "juice"],
      },
    );
    expect(note).toContain(
      "Do not ask a question whose answer the child just gave in the last words",
    );
    expect(talkLessonSystem(lessonInput(3), lessonRules(3))).toContain(
      "not 'I drink juice.' -> 'What do you do with the juice?'",
    );
  });

  it("[M-r2-1] 잡아 둔 질문이 둘이면 마지막 것만 남긴다(second-session L2 4 'Is it apple juice? What do you do with it?')", () => {
    const entries = [
      {
        en: "Oh, apples!",
        question: false,
        cue: false,
        state: "sent" as const,
      },
      {
        en: "Is it apple juice?",
        question: true,
        cue: false,
        state: "held" as const,
      },
      {
        en: "What do you do with it?",
        question: true,
        cue: false,
        state: "held" as const,
      },
    ] as RetrySentence[];
    keepLastHeldQuestion(entries);
    expect(entries.map((e) => [e.state, e.reason])).toEqual([
      ["sent", undefined],
      ["dropped", "question"],
      ["held", undefined],
    ]);
  });
});

describe("fix 2 더함 — 코드 검토 rev-fix-r1 Minor 1 · 2 · 3 · 6", () => {
  const none = () => undefined;

  it("Minor 1 · 6: 'A or B' 는 같은 명사를 되풀이하면 꾸밈말을 견주고 기능어를 건너뛴다", () => {
    // 정상 이어 묻기(대조군)
    expect(
      questionEchoesChild(
        "Red apples or green apples?",
        ["I like apples."],
        none,
      ),
    ).toBe(false);
    expect(
      questionEchoesChild(
        "Do you like big dogs or small dogs?",
        ["I like dogs."],
        none,
      ),
    ).toBe(false);
    expect(
      questionEchoesChild(
        "Is it cold juice or hot juice?",
        ["I drink the juice."],
        none,
      ),
    ).toBe(false);
    // 되묻기(기능어 'a' 를 건너뛰어 잡음 · r1 근거 꼴은 그대로)
    expect(questionEchoesChild("Is it a cat or a dog?", ["A dog."], none)).toBe(
      true,
    );
    expect(
      questionEchoesChild("Is the lake big or small?", ["Big."], none),
    ).toBe(true);
  });

  it("Minor 2 · 6: 소리 줄 뒤에 따라 말한 아이 말은 '먼저 답함'에서 빠지고, 먼저 답한 필수 질문은 기회 셈(제공 수)에도 든다", () => {
    const rows = [
      {
        speaker: "teacher" as const,
        text: "Sand on your hands!",
        move: {
          item: { kind: "none" as const, no: 0 },
          words: [],
          sound: { model: "I wash my hands." },
        },
      },
      { speaker: "child" as const, text: "I wash my hands." },
    ];
    expect(childLinesOf(rows, null, true)).toEqual([]);
    expect(childLinesOf(rows, null)).toEqual(["I wash my hands."]);
    expect(
      childAnsweredRequiredOf({
        required: SEED_CARD.required,
        childLines: childLinesOf(rows, null, true),
        lemmaOf,
      }),
    ).toEqual([]);
    // 이번 말이 소리 줄 바로 뒤면 그 말도 뺀다
    expect(childLinesOf(rows.slice(0, 1), "I wash my hands.", true)).toEqual(
      [],
    );
    const args = flow3([...opening3(), said()]);
    const before = nextTeacherTurnOf(args).chances;
    const after = nextTeacherTurnOf({ ...args, childAnswered: [2] }).chances;
    expect(after.required.map((r) => r.no)).not.toContain(2);
    expect(after.offered).toBe(before.offered + 1);
  });

  it("Minor 3: 'Huh?' 실패 대신 줄(받침 둘째 자리)은 '쉬운'을 약속하지 않는다 · 진짜 받침 둘째는 그대로", () => {
    const lines = {
      easy: [
        { en: "That's okay! Try this one.", ko: "괜찮아! 이거 해 봐." },
        { en: "No problem! Here is an easy one.", ko: "괜찮아! 쉬운 거야." },
        { en: "Okay! Here is a new one.", ko: "그래! 새로운 거야." },
      ],
    };
    const ai = {
      lowBand: true as const,
      segment: "talk" as const,
      cause: null,
      stage: 0,
    };
    for (const turnNo of [0, 1, 2, 3, 4, 5])
      expect(
        failSituationLineOf(lines, ai, "Huh?", turnNo, [])?.en,
        String(turnNo),
      ).not.toMatch(/easy/i);
    expect(failSituationLineOf(lines, ai, "Big.", 1, [])).toBeNull();
    expect(
      failSituationLineOf(
        lines,
        { ...ai, cause: "button", stage: 2 },
        null,
        1,
        [],
      )?.en,
    ).toBe("No problem! Here is an easy one.");
  });
});

describe("fix 3 — 대본 회차 r3 재판정 I-r3-1 · 코드 재검토 Minor 1~3 · M-r3-2 · M-r3-7", () => {
  const seedLines = () =>
    (
      JSON.parse(
        readFileSync(
          join(process.cwd(), "seed/lists/talk-situation-lines.json"),
          "utf8",
        ),
      ) as { lines: Record<string, { en: string; ko: string }[]> }
    ).lines;

  it("[I-r3-1] stuck-three L2 꼴: 받침 첫째 세 줄의 맞장구가 앞 차례에 모두 나왔어도 이미 통째로 쓴 줄로 돌아가지 않는다(5 · 7 같은 줄 막음)", () => {
    const lines = seedLines();
    const together = lines.together ?? [];
    const used5 = together[0]?.en ?? "";
    // stuck-three L2 2~6 의 앞 선생님 행 글(r3b 기록 꼴 — 5차례 줄은 지금 시드의 첫 줄)
    const texts = [
      "Hello, {NAME}! How are you?",
      "Good to hear! Now, let's learn some new words.\nBikes and ducks at the lake! Do you ride a bike?",
      "That's okay!\nListen, then say it with me!",
      "Okay! Here is a new one.\nDo you like bikes?",
      "No problem! Here is the answer.\nRice and fish for lunch! What do you do at the table?",
      `${used5}\nSay it with me!`,
      "Oh, juice! What juice do you like?",
    ];
    for (const turnNo of [0, 1, 2, 3, 4, 5, 6, 7]) {
      const line = situationLineOf(lines, "together", turnNo, { texts });
      expect(line?.en, String(turnNo)).not.toBe(used5);
      expect(
        texts.some((t) => t.includes(line?.en ?? "?")),
        String(turnNo),
      ).toBe(false);
    }
  });

  it("[I-r3-1] (나) 모든 줄이 통째로 쓰였거나 이 턴 맞장구와 겹치면, AI 맞장구가 남은 턴은 앞에 나오지 않은 넘김 꼬리만 · 들리지 않음 목록도 같은 고르기", () => {
    const lines = {
      together: [
        { en: "It's okay! I am with you.", ko: "괜찮아! 내가 같이 있어." },
        { en: "No problem! I can help.", ko: "괜찮아! 내가 도와줄게." },
        { en: "Okay! We can do this.", ko: "그래! 우리는 할 수 있어." },
      ],
      nospeech: [
        { en: "Oops, my ears! Let's go on.", ko: "앗, 내 귀가! 계속하자." },
        {
          en: "Hmm, no sound! Let's keep going.",
          ko: "음, 소리가 안 들려! 계속 가 보자.",
        },
      ],
    };
    const avoid = {
      texts: ["It's okay! I am with you.", "Okay! We can do this."],
      sentences: ["No problem!"],
    };
    expect(
      situationLineOf(lines, "together", 0, { ...avoid, reacted: true }),
    ).toEqual({ en: "I can help.", ko: "내가 도와줄게." });
    // 맞장구가 남지 않은 턴은 꼬리만 쓰지 않고 지금처럼(돌림 순서 첫 줄)
    expect(
      situationLineOf(lines, "together", 0, { ...avoid, reacted: false })?.en,
    ).toBe("It's okay! I am with you.");
    expect(
      situationLineOf(lines, "nospeech", 0, {
        texts: ["Oops, my ears! Let's go on."],
      })?.en,
    ).toBe("Hmm, no sound! Let's keep going.");
  });

  it("[코드 재검토 Minor 1] 같은 뜻 지움은 내용 낱말로 견준다('It's okay!' 뒤 'Okay, it's hard!' 는 남음)", () => {
    expect(echoesTurnSentence("Okay, it's hard!", ["It's okay!"])).toBe(false);
    expect(
      echoesTurnSentence("You can do it with me.", ["You can do it!"]),
    ).toBe(true);
  });

  it("[코드 재검토 Minor 2] 시드 꼴: 여러 문장 상황 줄의 첫 문장은 맞장구다(넘김만 붙이기가 맞게 돈다) · 들리지 않음 'can't hear well' 줄 없음", () => {
    const lines = seedLines();
    for (const [place, list] of Object.entries(lines))
      for (const line of list) {
        const sentences = splitSentences(line.en);
        if (sentences.length < 2) continue;
        expect(
          isShortReaction(sentences[0] ?? ""),
          `${place}: ${line.en}`,
        ).toBe(true);
      }
    expect((lines.nospeech ?? []).map((l) => l.en).join(" ")).not.toContain(
      "can't hear well",
    );
  });

  it("[코드 재검토 Minor 3] 맞장구 낱말 수 기준은 한 상수이고 고정부 글('at most four words')과 같다", () => {
    const NUMBER_WORDS: Record<number, string> = {
      3: "three",
      4: "four",
      5: "five",
    };
    expect(SHORT_REACTION_MAX_WORDS).toBe(4);
    for (const level of [3, 4])
      expect(
        talkLessonSystem(lessonInput(level), lessonRules(level)),
      ).toContain(
        `a short reaction of at most ${NUMBER_WORDS[SHORT_REACTION_MAX_WORDS]} words`,
      );
  });

  it("[M-r3-7] 시드 받침 첫째 줄의 둘째 문장은 권유('Let's try.' · 같이 하자)가 아니다 — 신호 말과 권유가 두 번 되지 않게", () => {
    for (const line of seedLines().together ?? []) {
      const rest = splitSentences(line.en).slice(1).join(" ");
      expect(rest, line.en).not.toMatch(/let's|let us|\btry\b|together/i);
    }
  });

  it("[M-r3-2] 질문 둘이면 되묻기를 먼저 빼고 남길 질문을 고른다 · 때 부사 'now' 로 되묻기 검사를 비껴가지 않는다", () => {
    const none = () => undefined;
    expect(
      questionEchoesChild("Are you hungry now?", ["Yes I am hungry"], none),
    ).toBe(true);
    const held = (en: string) => ({
      en,
      question: true,
      cue: false,
      state: "held" as const,
    });
    const entries = [
      held("What food do you like?"),
      held("Are you hungry now?"),
    ] as RetrySentence[];
    keepLastHeldQuestion(entries, (q) =>
      questionEchoesChild(q, ["Yes I am hungry"], none),
    );
    expect(entries.map((e) => e.state)).toEqual(["held", "dropped"]);
    // 모두 되묻기면 마지막(지금처럼)
    const both = [
      held("Are you hungry?"),
      held("Are you hungry now?"),
    ] as RetrySentence[];
    keepLastHeldQuestion(both, () => true);
    expect(both.map((e) => e.state)).toEqual(["dropped", "held"]);
  });
});

describe("fix 3 재검토 Minor — AI 맞장구가 남은 턴의 (가) 단계도 꼬리 문장 되풀이를 막는다", () => {
  it("[fix3-M1] 두 줄 모두 (1)에 걸려 (가)로 갈 때, 맞장구가 남은 턴이면 꼬리가 앞에 나온 줄은 고르지 않는다", () => {
    const lines = {
      together: [
        { en: "It's okay! I am with you.", ko: "괜찮아! 내가 같이 있어." },
        { en: "No problem! I can help.", ko: "괜찮아! 내가 도와줄게." },
      ],
    };
    // 첫 줄의 꼬리('I am with you.')와 둘째 줄의 맞장구('No problem!')가 앞 선생님 행에 나왔다 — 두 줄 모두 (1)에 걸림
    const texts = ["Great! I am with you.", "No problem!"];
    const picked = situationLineOf(lines, "together", 0, {
      texts,
      reacted: true,
    });
    const shown = picked ? situationTailOf(picked, true) : null;
    expect(shown?.en).toBe("I can help.");
    // 맞장구가 남지 않은 턴은 줄 전체를 쓰므로 지금처럼 (가)의 돌림 순서 첫 줄
    expect(
      situationLineOf(lines, "together", 0, { texts, reacted: false })?.en,
    ).toBe("It's okay! I am with you.");
  });
});

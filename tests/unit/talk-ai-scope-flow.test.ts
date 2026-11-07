// '회화 AI 몫 넓힘' 묶음 1 흐름 몫(plan 1 행 · 정한 것 1 · 3, spec 판 4 설계 2 · 3 · 4 · 5 · AC-2 (나) 계획 · AC-3 (가)(나) · AC-4 (가) ·
// AC-5 (나) 흐름). 장면 여는 질문 · 둘째 인사 AI 차례 · 따라가기 상한의 '이번 차례에 돌아오기' · 'Child said more' · 들리지 않음 설명 줄 ·
// 이어 묻기 고르기 답 버림. 숫자는 시험용 설정에서 읽는다. 실제 API 를 부르지 않는다.
import { describe, expect, it } from "vitest";
import {
  cardChainGuardOf,
  normalizeTalkLesson,
  type TalkLessonOutput,
  talkCallTurnOf,
  talkLessonUserMessage,
} from "@/core/ai/calls/talk-lesson";
import { childSaidMoreOf } from "@/core/conversation/child-kind";
import {
  type LessonArgs,
  nextTeacherTurnOf,
  type TeacherTurnPlan,
  talkLessonPositionOf,
  teacherTurnPlansOf,
} from "@/core/conversation/lesson-flow";
import type { TalkLessonTurn } from "@/core/conversation/lesson-turns";
import { questionKeyOf } from "@/core/conversation/question-check";
import {
  lemmaOf,
  lessonInput,
  lessonRules,
} from "../fixtures/ai/talk-lesson-inputs";
import {
  aiTurn,
  button,
  CARD3,
  CARD3_GREET2,
  CARD3_SCENE,
  CARD4,
  LOW,
  MID,
  NEW3,
  NEW4,
  noSpeech,
  opening3,
  SCENE3,
  SPEC3,
  SPEC4,
  said,
  teacher,
} from "../fixtures/talk-lesson";

const FEELING = ["happy", "tired", "fun"];
const SCENE_Q = "Do you like the park?";

function args3(
  turns: TalkLessonTurn[],
  over: Partial<LessonArgs> = {},
): LessonArgs {
  return {
    spec: SPEC3,
    card: CARD3_SCENE,
    newWords: NEW3,
    turns,
    segment: "talk",
    settings: LOW,
    prepWords: CARD3.prep ?? [],
    ...over,
  };
}
function args4(
  turns: TalkLessonTurn[],
  over: Partial<LessonArgs> = {},
): LessonArgs {
  return {
    spec: SPEC4,
    card: { ...CARD4, sceneOpener: SCENE3 },
    newWords: NEW4,
    turns,
    segment: "talk",
    settings: MID,
    prepWords: [],
    ...over,
  };
}

/** 인사 둘 → 인사 끝 반응까지(대화 첫 질문 차례). */
const greeted3 = (): TalkLessonTurn[] => opening3().slice(0, 5);
/** 인사 뒤 장면 여는 질문까지 온 3단계 행. */
function scene3(): TalkLessonTurn[] {
  return [
    ...greeted3(),
    teacher(SCENE3.question.en, { kind: "first_question" }),
  ];
}

/** 말 입력 턴의 호출 입력(답함 · 막힘 두 계획, 느낌 낱말을 줌). */
function speechCall(
  args: LessonArgs,
  child: string,
  over: { feelingWords?: readonly string[] | null } = {},
) {
  const { ifAnswered, ifStuck } = teacherTurnPlansOf(args, {
    segment:
      args.segment === "greeting" || args.segment === "more_talk"
        ? args.segment
        : "talk",
    targets: [],
  });
  return talkCallTurnOf({
    plan: ifAnswered,
    ifStuck,
    child,
    input: "speech",
    hintKind: "none",
    hintTier: 0,
    heardHelp: "none",
    ...(over.feelingWords === null
      ? {}
      : { feelingWords: over.feelingWords ?? FEELING, lemmaOf }),
  });
}
/** '모름' · 들리지 않음 턴의 호출 입력(계획 하나). */
function dontKnowCall(plan: TeacherTurnPlan) {
  return talkCallTurnOf({
    plan,
    child: "",
    input: "dont_know",
    hintKind: "none",
    hintTier: 0,
    heardHelp: "none",
    feelingWords: FEELING,
    lemmaOf,
  });
}

describe("장면 여는 질문(AC-5 (나) 흐름 몫 · C206 · 02-2 200줄)", () => {
  it("1~3단계 카드에 장면 여는 질문이 있으면 수업 첫 대화 질문은 그 질문이다(질문 줄 role scene · 카드 항목 없음 · AI 없음)", () => {
    const plan = nextTeacherTurnOf(args3(greeted3()));
    expect(plan).toMatchObject({
      kind: "first_question",
      callsAi: false,
      item: { kind: "none", no: 0 },
      words: [],
      goals: [],
    });
    expect(plan.attach).toEqual([
      {
        kind: "question",
        role: "scene",
        en: SCENE3.question.en,
        ko: SCENE3.question.ko,
        item: { kind: "none", no: 0 },
      },
    ]);
  });

  it("칸이 없는 카드(개정 4 꼴)와 4단계 카드는 지금처럼 첫 필수 질문으로 시작한다(plan 정한 것 3)", () => {
    const old = nextTeacherTurnOf(args3(greeted3(), { card: CARD3 }));
    expect(old.attach[0]).toMatchObject({
      role: "card",
      item: { kind: "required", no: 1 },
    });
    const opened4: TalkLessonTurn[] = [
      teacher("Hi! How was your day?", { kind: "first_question" }),
      said({ segment: "greeting_end" }),
      teacher("Nice! Let's talk.", { kind: "ai" }),
    ];
    const four = nextTeacherTurnOf(args4(opened4));
    expect(four.attach[0]).toMatchObject({
      role: "card",
      item: { kind: "required", no: 1 },
    });
  });

  it("대화 중 연 짧은 준비 뒤의 대화 첫 질문은 장면 여는 질문이 아니라 지금 길('Now let's talk.' 뒤 다음 기회)이다", () => {
    const turns: TalkLessonTurn[] = [
      ...scene3(),
      said(),
      aiTurn("Me too! What do you do on the weekend?", {
        item: { kind: "required", no: 1 },
        words: ["play"],
      }),
      button(),
      teacher("That's okay!", {
        kind: "card_slot",
        why: "support",
        stage: 3,
        cause: "button",
        app: ["answer_example", "prep"],
        prep: { words: ["play"] },
      }),
    ];
    const plan = nextTeacherTurnOf(args3(turns));
    expect(plan.kind).toBe("first_question");
    expect(plan.attach[0]).toEqual({ kind: "app_line", en: "Now let's talk." });
    expect(
      plan.attach.some((l) => l.kind === "question" && l.role === "scene"),
    ).toBe(false);
  });

  it("아이가 답하면 첫 AI 차례 사용자 메시지에 'App question just before'(그 질문 · 카드 기회 아님)와 'Follow up on the child's answer: yes' 가 든다", () => {
    const turn = speechCall(args3(scene3()), "Yes! I like it.");
    expect(turn.kind).toBe("ai");
    // [M-2] 장면 문장까지 칸 글 전체
    expect(turn.appAsked).toEqual({
      en: SCENE3.question.en,
      card: false,
      scene: true,
    });
    expect(turn.followUpAnswer).toBe(true);
    expect(turn.afterCardChance).toBe(false);
    const lines = talkLessonUserMessage(turn).split("\n");
    expect(lines[0]).toBe(
      `App question just before (not in the turns above): ${SCENE3.question.en} (card chance: no)`,
    );
    expect(lines).toContain("Follow up on the child's answer: yes");
    // 막혔다고 볼 때의 계획(If stuck)은 받침 카드 자리다 — 고른 계획이 막힘이면 Follow up 은 다음 질문 칸이 없어 쓰이지 않는다
    expect(turn.ifStuck).toMatchObject({ kind: "card_slot", supportStage: 1 });
  });

  it("장면 여는 질문은 카드 기회 셈 밖이고 같은 질문 셈 안이며, 아이 답은 말 주고받기 수에 든다", () => {
    const before = nextTeacherTurnOf(args3(greeted3()));
    const after = nextTeacherTurnOf(args3([...scene3(), said()]));
    expect(after.chances.required).toEqual(before.chances.required);
    expect(after.chances.required.map((r) => r.no)).toEqual([1, 2, 3]);
    expect(after.afterChance).toBe(false);
    const asked = talkLessonPositionOf(args3(scene3()));
    const pos = talkLessonPositionOf(args3([...scene3(), said()]));
    expect(pos.askedQuestions.get(questionKeyOf(SCENE_Q))).toBe(1);
    expect(pos.talkCount).toBe(asked.talkCount + 1);
    expect(pos.answeredSlot).toMatchObject({
      scene: true,
      item: { kind: "none", no: 0 },
      words: [],
      answerExample: SCENE3.answerExample,
      easyQuestion: SCENE3.easyQuestion,
    });
  });

  it("막히면 받침 표대로 첫째 · 셋째는 그 칸의 답 예시 소리, 둘째는 그 칸의 쉬운 질문을 붙인다", () => {
    const first = nextTeacherTurnOf(args3([...scene3(), button()]));
    expect(first).toMatchObject({ kind: "card_slot", stage: 1 });
    expect(first.attach).toEqual([
      { kind: "sound", role: "answer", en: SCENE3.answerExample },
    ]);
    const s1 = teacher("That's okay!", {
      kind: "card_slot",
      why: "support",
      stage: 1,
      cause: "button",
      app: ["together", "answer_example"],
    });
    const second = nextTeacherTurnOf(
      args3([...scene3(), button(), s1, button()]),
    );
    expect(second).toMatchObject({ kind: "card_slot", stage: 2 });
    expect(second.attach).toEqual([
      {
        kind: "question",
        role: "easy",
        en: SCENE3.easyQuestion.en,
        ko: SCENE3.easyQuestion.ko,
        item: { kind: "none", no: 0 },
      },
    ]);
    const userMessage = talkLessonUserMessage(dontKnowCall(second));
    expect(userMessage).toContain(
      `Card line: easy question for the scene question: ${SCENE3.easyQuestion.en}`,
    );
    const s2 = teacher(`That's okay! ${SCENE3.easyQuestion.en}`, {
      kind: "card_slot",
      why: "support",
      stage: 2,
      cause: "button",
      app: ["easy_question"],
    });
    const third = nextTeacherTurnOf(
      args3([...scene3(), button(), s1, button(), s2, button()]),
    );
    expect(third).toMatchObject({
      kind: "card_slot",
      stage: 3,
      item: { kind: "required", no: 1 },
    });
    expect(third.attach[0]).toEqual({
      kind: "sound",
      role: "answer",
      en: SCENE3.answerExample,
    });
  });

  it("받침 뒤에 말로 답해도 그 자리가 장면 여는 질문이면 다음 AI 차례는 Follow up 이다", () => {
    const s1 = teacher("That's okay!", {
      kind: "card_slot",
      why: "support",
      stage: 1,
      cause: "button",
      app: ["together", "answer_example"],
    });
    const turn = speechCall(args3([...scene3(), button(), s1]), "Yes, I do.");
    expect(turn.followUpAnswer).toBe(true);
    expect(turn.appAsked).toBeNull();
  });

  it("Follow up 차례에 갈래 · 카드 항목이 필수 질문이면 앱이 되돌린다(cardChainGuardOf · 정규화, spec 설계 5 [M-6])", () => {
    expect(
      cardChainGuardOf({
        nextMove: "required",
        afterCardChance: false,
        followUpAnswer: true,
      }),
    ).toEqual({ nextMove: "follow_up", dropCardItem: false, chained: true });
    expect(
      cardChainGuardOf({ nextMove: "required", afterCardChance: false }),
    ).toMatchObject({ nextMove: "required", chained: false });
    const out = normalizeTalkLesson(
      answer({ next_move: "required", card_item: { kind: "required", no: 2 } }),
      lessonInput(3, { turn: { followUpAnswer: true } }),
      lessonRules(3),
    );
    expect(out?.next_move).toBe("follow_up");
  });
});

describe("[N-1] 시드 꼴 인사 질문(인사 + 물음표 문장)의 답 소리", () => {
  // 3단계 단원 1 카드와 같은 꼴: 인사 턴 하나, 질문 글이 'Hello, {NAME}! How are you?'(앱이 붙인 행 글도 그대로)
  const card = {
    ...CARD3_SCENE,
    greetingTurns: 1,
    greeting: {
      questions: [
        {
          question: {
            en: "Hello, {NAME}! How are you?",
            ko: "안녕, {NAME}! 잘 지냈어?",
          },
          hintKo: "나는 잘 지내.",
          hintEn: "I am fine.",
          frameEn: "I am ___.",
          answerExample: "I am fine.",
        },
      ],
    },
  };
  const first = teacher("Hello, {NAME}! How are you?", {
    kind: "first_question",
  });
  const opts = { card, segment: "greeting" as const };

  it("인사 '모름' 뒤 받침 첫째는 카드 인사 답을 소리 줄로 들려준다", () => {
    const plan = nextTeacherTurnOf(
      args3([first, button({ segment: "greeting" })], opts),
    );
    expect(plan).toMatchObject({ kind: "card_slot", stage: 1 });
    expect(plan.attach).toEqual([
      { kind: "sound", role: "answer", en: "I am fine." },
    ]);
  });

  it("인사가 들리지 않음이면 인사 끝 차례에 카드 인사 답 소리가 붙는다", () => {
    const plan = nextTeacherTurnOf(
      args3([first, noSpeech({ segment: "greeting" })], opts),
    );
    expect(plan).toMatchObject({
      kind: "card_slot",
      segment: "greeting_end",
      answerFallback: "I am fine.",
    });
    expect(plan.attach).toEqual([
      { kind: "sound", role: "answer", en: "I am fine." },
    ]);
  });
});

describe("둘째 인사(AC-2 (나) 계획 몫 · spec 설계 2 [M-2])", () => {
  const first = teacher("Hi! How are you today?", { kind: "first_question" });

  it("인사 턴 2 카드에서 첫 인사에 말로 답하면 둘째 인사는 AI 질문 차례이고 대신 줄은 카드 둘째 인사 질문이다", () => {
    const args = args3([first, said({ segment: "greeting" })], {
      card: CARD3_GREET2,
      segment: "greeting",
    });
    const plan = nextTeacherTurnOf(args);
    expect(plan).toMatchObject({
      kind: "ai",
      segment: "greeting",
      aiAsks: true,
      attach: [],
    });
    expect(plan.greetingFallback).toMatchObject({
      kind: "question",
      role: "greeting",
      en: "Do you like Sunday?",
    });
    // 말 입력 턴의 두 계획은 아이 행을 붙여 만든다(인사 질문 행까지 넘김)
    const lines = talkLessonUserMessage(
      speechCall({ ...args, turns: [first] }, "I am good.", {
        feelingWords: null,
      }),
    ).split("\n");
    expect(lines).toEqual(
      expect.arrayContaining([
        "Segment: greeting",
        "Turn: ai",
        "Question: yes",
      ]),
    );
  });

  it("[I-1] AI 둘째 인사 질문에 답하면 인사 끝이고, 그 자리 답 예시는 AI 답 예시다(카드 둘째 인사 답이 아님)", () => {
    const turns = [
      first,
      said({ segment: "greeting" }),
      aiTurn("Me too! What do you eat for lunch?", {}, "I eat rice."),
      said({ segment: "greeting" }),
    ];
    const pos = talkLessonPositionOf(
      args3(turns, { card: CARD3_GREET2, segment: "greeting" }),
    );
    expect(pos.greetingEndNow).toBe(true);
    expect(pos.answeredSlot?.answerExample).toBe("I eat rice.");
  });

  it("[I-1] AI 둘째 인사 뒤 '모름'이면 받침 첫째 소리 줄은 AI 질문의 답이고, 카드 인사 질문이 붙은 행은 카드 답이다", () => {
    const opts = { card: CARD3_GREET2, segment: "greeting" as const };
    const ai = nextTeacherTurnOf(
      args3(
        [
          first,
          said({ segment: "greeting" }),
          aiTurn("Me too! What do you eat for lunch?", {}, "I eat rice."),
          button({ segment: "greeting" }),
        ],
        opts,
      ),
    );
    expect(ai).toMatchObject({ kind: "card_slot", stage: 1 });
    expect(ai.attach).toEqual([
      { kind: "sound", role: "answer", en: "I eat rice." },
    ]);
    // AI 질문이 걸려 카드 둘째 인사(greetingFallback)를 붙인 행 — 질문 열쇠가 카드 인사와 같아 카드 답을 쓴다
    const card = nextTeacherTurnOf(
      args3(
        [
          first,
          said({ segment: "greeting" }),
          teacher("Me too! Do you like Sunday?", { kind: "ai" }, "Sure."),
          button({ segment: "greeting" }),
        ],
        opts,
      ),
    );
    expect(card.attach).toEqual([
      { kind: "sound", role: "answer", en: "Yes, I do." },
    ]);
  });

  it("첫 인사가 들리지 않음이나 막힘이면 둘째 인사는 지금처럼 카드 자리다(말로 답한 뒤만 AI 차례)", () => {
    const silent = nextTeacherTurnOf(
      args3([first, noSpeech({ segment: "greeting" })], {
        card: CARD3_GREET2,
        segment: "greeting",
      }),
    );
    expect(silent.kind).toBe("card_slot");
    expect(silent.greetingFallback).toBeUndefined();
    const stuck = nextTeacherTurnOf(
      args3([first, button({ segment: "greeting" })], {
        card: CARD3_GREET2,
        segment: "greeting",
      }),
    );
    expect(stuck.kind).toBe("card_slot");
  });
});

describe("따라가기 상한 · 이번 차례에 돌아오기(AC-3 (가) · 02-2 194줄)", () => {
  /** 장면 여는 질문 답 뒤 따라가기 갈래 AI 차례가 n 번 이어진 행(마지막은 선생님 행 — 아이 말은 speechCall 이 붙인다). */
  function followed(n: number): TalkLessonTurn[] {
    const turns: TalkLessonTurn[] = [...scene3()];
    for (let i = 0; i < n; i++)
      turns.push(
        said(),
        aiTurn(`Dinosaurs ${i}! Do you like a big one?`, {
          next: "follow_child",
        }),
      );
    return turns;
  }

  it("따라가기 갈래가 talk.follow_child_turns 번 이어진 다음 턴은 카드 자리가 아니고 사용자 메시지에 '이번 차례에 돌아오기'가 든다", () => {
    const turn = speechCall(
      args3(followed(LOW.followChildTurns)),
      "I like big dinosaurs.",
    );
    expect(turn.kind).toBe("ai");
    expect(turn.cardLine).toBeNull();
    expect(turn.returnNow).toBe(true);
    const lines = talkLessonUserMessage(turn).split("\n");
    expect(lines).toContain("Come back to today's topic in this turn: yes");
    // 기회 알림 줄은 따로 그대로 있다
    expect(lines).toContain("Return to today's topic: no");
    expect(lines.indexOf("Come back to today's topic in this turn: yes")).toBe(
      lines.indexOf("Return to today's topic: no") + 1,
    );
  });

  it("그 턴도 따라가기면 그다음 턴이 카드 자리(가장 앞의 남은 기회)이고 돌아오기 줄은 없다", () => {
    const turn = speechCall(
      args3(followed(LOW.followChildTurns + 1)),
      "A T-rex is big.",
    );
    expect(turn.kind).toBe("card_slot");
    expect(turn.cardLine).toMatchObject({ kind: "required", no: 1 });
    expect(turn.returnNow).toBeUndefined();
    expect(talkLessonUserMessage(turn)).not.toContain("Come back");
  });

  it("상한 아래 턴에는 돌아오기 줄이 없다", () => {
    const turn = speechCall(
      args3(followed(LOW.followChildTurns - 1)),
      "I like big ones.",
    );
    expect(turn.returnNow).toBeUndefined();
    expect(talkLessonUserMessage(turn)).not.toContain("Come back");
  });
});

describe("Child said more(AC-3 (나) · 02-2 198줄 [I-2])", () => {
  it("영어 낱말 셋 이상이거나 느낌 낱말이 든 아이 말에서만 참이다", () => {
    const yes = [
      "I like the park.",
      "My dog is big.",
      "Happy!",
      "So fun!",
      "Tired.",
    ];
    const no = ["Rice.", "Big fish.", "Yes.", "I don't know.", "Huh what?", ""];
    for (const text of yes)
      expect(childSaidMoreOf(text, FEELING, lemmaOf), text).toBe(true);
    for (const text of no)
      expect(childSaidMoreOf(text, FEELING, lemmaOf), text).toBe(false);
    // 느낌 낱말은 원형으로도 본다
    expect(
      childSaidMoreOf("Fun!", ["funny"], (w) =>
        w.toLowerCase() === "fun" ? "funny" : undefined,
      ),
    ).toBe(true);
    expect(childSaidMoreOf("Happy!", [], lemmaOf)).toBe(false);
  });

  it("1~3단계 AI 차례 사용자 메시지에 'Child said more: yes · no' 가 든다(Input 줄 바로 뒤)", () => {
    const args = args3([
      ...scene3(),
      said(),
      aiTurn("Nice! Do you play there?"),
    ]);
    const more = talkLessonUserMessage(
      speechCall(args, "I play tag with my friend."),
    ).split("\n");
    expect(more[more.indexOf("Input: speech") + 1]).toBe(
      "Child said more: yes",
    );
    const short = talkLessonUserMessage(speechCall(args, "Tag.")).split("\n");
    expect(short).toContain("Child said more: no");
  });

  it("느낌 낱말을 받지 않았거나 카드 자리 차례면 줄이 없다", () => {
    const args = args3([
      ...scene3(),
      said(),
      aiTurn("Nice! Do you play there?"),
    ]);
    expect(
      talkLessonUserMessage(
        speechCall(args, "I play tag.", { feelingWords: null }),
      ),
    ).not.toContain("Child said more");
    const slot = dontKnowCall(
      nextTeacherTurnOf(args3([...scene3(), button()])),
    );
    expect(slot.kind).toBe("card_slot");
    expect(slot.childSaidMore).toBeUndefined();
  });

  it("4단계 AI 차례는 느낌 낱말을 받아도 줄이 없다(4단계 불변)", () => {
    const opened4: TalkLessonTurn[] = [
      teacher("Hi! How was your day?", { kind: "first_question" }),
      said({ segment: "greeting_end" }),
      teacher("Nice! Let's talk.", { kind: "ai" }),
      teacher("What is your favorite subject?", {
        kind: "first_question",
        item: { kind: "required", no: 1 },
        words: ["math"],
      }),
    ];
    const turn = speechCall(args4(opened4), "I like math. It is fun.");
    expect(turn.childSaidMore).toBeUndefined();
    expect(turn.followUpAnswer).toBeUndefined();
    expect(talkLessonUserMessage(turn)).not.toContain("Child said more");
  });
});

describe("들리지 않음 설명 줄(spec 설계 1 장치 '입력' · 02-2 208줄 · C211 (4))", () => {
  it("1~3단계 들리지 않음 차례는 Reason 줄 바로 뒤에 기술 문제 설명 줄이 든다", () => {
    const turn = dontKnowCall(
      nextTeacherTurnOf(args3([...scene3(), noSpeech()])),
    );
    expect(turn.reason).toBe("nospeech");
    expect(turn.notHeard).toBe(true);
    const lines = talkLessonUserMessage(turn).split("\n");
    expect(lines[lines.indexOf("Reason: nospeech") + 1]).toBe(
      "Not heard: the microphone did not get the child's voice. It is a technical problem, not the child's answer, not \"don't know\" and not a mistake.",
    );
  });

  it("단추 막힘 차례에는 설명 줄이 없다", () => {
    const turn = dontKnowCall(
      nextTeacherTurnOf(args3([...scene3(), button()])),
    );
    expect(turn.notHeard).toBeUndefined();
    expect(talkLessonUserMessage(turn)).not.toContain("Not heard");
  });
});

// ── 답 자리(AC-4 (가) · C205 · spec 설계 4): 서버 거름의 소리 줄 ─────────────

function answer(over: Partial<TalkLessonOutput> = {}): TalkLessonOutput {
  return {
    child_kind: "answer",
    stuck: false,
    tori_en: "Nice! Do you like your friend or your day?",
    model_line: "",
    choices: [],
    tori_ko: ["좋아!", "친구가 좋아, 하루가 좋아?"],
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
    next_hint_ko: "친구가 좋아.",
    next_hints: ["I like my ___.", "I like my friend."],
    next_usable_phrases: [],
    next_answer_example: "I like my friend.",
    image_word: "",
    farewell: "",
    farewell_ko: "",
    good_lines: [],
    next_time_lines: [],
    summary: "",
    ...over,
  };
}

describe("답 자리(AC-4 (가) — 소리 줄은 받침 · 새 단어 꺼내기에서만)", () => {
  const follow = ["I like my friend.", "I like my day."];

  it("2~3단계 · 1단계 모두 이어 묻는 고르기 질문의 선택지를 버리고 질문은 남긴다", () => {
    for (const choices of [false, true]) {
      const input = lessonInput(3, { turn: { child: "Yes." } });
      const out = normalizeTalkLesson(
        answer({ choices: follow }),
        { ...input, spec: { ...input.spec, choices } },
        lessonRules(3),
      );
      expect(out?.choices, `choices ${choices}`).toEqual([]);
      expect(out?.tori_en).toBe("Nice! Do you like your friend or your day?");
    }
  });

  it("받침 둘째의 선택지 · 받침 첫째 · 셋째 · 들리지 않음 · 꺼낼 새 단어의 따라 할 말은 남는다", () => {
    const easy = normalizeTalkLesson(
      answer({
        tori_en: "That's okay! Do you play soccer?",
        choices: ["I like soccer.", "I like tag."],
        next_targets: ["soccer"],
        support: "choices",
      }),
      lessonInput(3, {
        turn: {
          child: "",
          input: "dont_know",
          reason: "button",
          supportStage: 2,
          stuckQuestion: "What sport is fun?",
        },
      }),
      lessonRules(3),
    );
    expect(easy?.choices).toEqual(["I like soccer.", "I like tag."]);
    for (const turn of [
      { supportStage: 1, aiAsks: false, reason: "button" as const },
      { supportStage: 3, reason: "button" as const },
      { supportStage: 0, reason: "nospeech" as const },
    ]) {
      const out = normalizeTalkLesson(
        answer({
          tori_en: "That's okay! What sport is fun?",
          model_line: "I play soccer.",
          next_targets: ["soccer"],
        }),
        lessonInput(3, {
          turn: {
            child: "",
            input: "dont_know",
            stuckQuestion: "What do you do on the weekend?",
            stuckAnswer: "I play.",
            ...turn,
          },
        }),
        lessonRules(3),
      );
      expect(out?.model_line, JSON.stringify(turn)).toBe("I play soccer.");
    }
    const intro = normalizeTalkLesson(
      answer({
        tori_en: "The weekend is fun! What do you do on the weekend?",
        model_line: "The weekend.",
        new_words: ["weekend"],
        // 꺼내기 갈래일 때만(13절 C205 · 판정 r1 I-5 — 필수 질문 · 이어 묻기 갈래는 자리 밖)
        next_move: "introduce",
      }),
      lessonInput(3),
      lessonRules(3),
    );
    expect(intro?.model_line).toBe("The weekend.");
  });
});

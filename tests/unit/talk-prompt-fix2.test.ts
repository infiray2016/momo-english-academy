// 회화 턴 프롬프트 · 흐름 규칙 고침 2(대본 2회차 설계 검토 task-talk-quality-review-1.md C-1 · I-1 · I-2 · I-4 · M-1 · M-2 · M-4 · M-7, 13절 C204 잠정).
// 막힘 경계 · 아이 말 갈래(앱이 막힘을 무름 · 통째로 다시 쓰기) · 설명 · 뜻의 영어 문장 거름 · 받침 닫기 신호 말 · 카드 답 뒤 필수 질문 되돌림 ·
// 고정부 규칙 문장. 실제 API 를 부르지 않는다. 설계 숫자는 시험용 설정 · 견본에서 읽는다.
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  cardChainGuardOf,
  normalizeTalkLesson,
  type TalkCallStuckPlan,
  type TalkLessonOutput,
  TEACHER_SENTENCES_SETTING_SCHEMAS,
  talkLessonSystem,
  talkLessonTurnSpec,
  teacherSentencesMaxOf,
} from "@/core/ai/calls/talk-lesson";
import {
  createRewriteHold,
  effectiveStuckOf,
  isDontKnowSaying,
  isEnglishSaying,
} from "@/core/conversation/child-kind";
import {
  type LessonArgs,
  nextTeacherTurnOf,
  talkLessonPositionOf,
} from "@/core/conversation/lesson-flow";
import {
  mergeQuestionRetry,
  stuckRewriteNoteOf,
} from "@/core/conversation/question-retry";
import { withoutEnglishSentencesOf } from "@/core/conversation/spoken";
import { createToriEnReader } from "@/core/conversation/stream";
import {
  createLessonSentenceFlow,
  type LessonOutcomeView,
  settleLessonTurn,
  withQuestionRetry,
} from "@/server/conversation/lesson-turn";
import { turnSettings } from "@/server/conversation/turn";
import {
  GOAL_1,
  lessonInput,
  lessonRules,
  values,
} from "../fixtures/ai/talk-lesson-inputs";
import {
  aiTurn,
  CARD3,
  LOW,
  NEW3,
  opening3,
  SPEC3,
  said,
} from "../fixtures/talk-lesson";

/** 빈 응답 위에 고칠 칸만 얹는다(3단계 AI 차례, 이어 묻기). */
function answer(over: Partial<TalkLessonOutput> = {}): TalkLessonOutput {
  return {
    child_kind: "answer",
    stuck: false,
    tori_en: "Oh, a dog! Is your dog big?",
    model_line: "",
    choices: [],
    tori_ko: ["오, 강아지!", "강아지 커?"],
    recast: "",
    explanation: "",
    new_words: [],
    self_used_words: [],
    mission_done: [],
    response_fit: true,
    child_topic: true,
    child_asked: false,
    goal_suggest: [],
    next_move: "follow_child",
    card_item: { kind: "none", no: 0 },
    next_goal: [GOAL_1],
    support: "none",
    next_targets: [],
    next_hint_ko: "강아지가 큰지 말해 봐.",
    next_hints: ["My dog is ___.", "My dog is big."],
    next_usable_phrases: [],
    next_answer_example: "My dog is big.",
    image_word: "",
    farewell: "",
    farewell_ko: "",
    good_lines: [],
    next_time_lines: [],
    summary: "",
    ...over,
  };
}

/** 말 입력 턴의 막힘 계획(1~3단계 받침 첫째 카드 자리 — 묶음 5 ifStuck 꼴). */
const IF_STUCK: TalkCallStuckPlan = {
  kind: "card_slot",
  aiAsks: false,
  cardLine: null,
  supportStage: 1,
  stuckQuestion: "What do you do on the weekend?",
  stuckAnswer: "I play.",
};

function norm(
  value: Partial<TalkLessonOutput> | Record<string, unknown>,
  child: string,
  level = 3,
): TalkLessonOutput {
  const input = lessonInput(level, {
    turn: { child, input: "speech", ifStuck: IF_STUCK },
  });
  const out = normalizeTalkLesson(
    { ...answer(), ...value },
    input,
    lessonRules(level),
  );
  if (out === null) throw new Error("정규화가 null 이다");
  return out;
}

describe("C-1 막힘 경계 · 아이 말 갈래(13절 C204 (1)~(3))", () => {
  it("모름 표현 · 영어 말 가리기: 모름 구 · 모름 낱말만인 말은 모름이고, 영어 낱말 둘 이상이고 모름이 아니면 영어 말이다", () => {
    for (const t of ["I don't know.", "Huh?", "What?", "Sorry, what?"])
      expect(isDontKnowSaying(t), t).toBe(true);
    expect(isDontKnowSaying("What is it?")).toBe(false);
    for (const t of ["I have a dog.", "Yes big fish.", "My dog is big."])
      expect(isEnglishSaying(t), t).toBe(true);
    for (const t of ["Rice.", "Cold.", "I don't know.", "밥", ""])
      expect(isEnglishSaying(t), t).toBe(false);
  });

  it("앱이 보는 막힘: 갈래가 답 · 새 이야기 · 짧은 관련 말이면 무르고, 못 알아들음 · 관계없는 낱말이면 그대로, 갈래가 없으면 영어 말인지로 본다(무르기만 함)", () => {
    const of = (
      childKind: Parameters<typeof effectiveStuckOf>[0]["childKind"],
      child: string,
      aiStuck = true,
    ) => effectiveStuckOf({ aiStuck, childKind, child, input: "speech" });
    expect(of("new_topic", "I have a dog.")).toBe(false);
    expect(of("answer", "Rice.")).toBe(false);
    expect(of("short_related", "Cold.")).toBe(false);
    expect(of("not_understood", "Huh?")).toBe(true);
    expect(of("unrelated_words", "Blue car.")).toBe(true);
    expect(of(undefined, "Yes big fish.")).toBe(false);
    expect(of(undefined, "Huh?")).toBe(true);
    // AI 가 막힘이 아니라 한 말은 막힘으로 바꾸지 않는다
    expect(of("not_understood", "Huh?", false)).toBe(false);
    // 말 입력이 아니면 AI 판단 그대로
    expect(
      effectiveStuckOf({
        aiStuck: true,
        childKind: "answer",
        child: "",
        input: "dont_know",
      }),
    ).toBe(true);
    // 영어 낱말 셋 이상의 말은 갈래가 막힘 갈래여도 막힘이 아니다(검토 rev-prompt-2 D), 두 낱말은 갈래가 정한다
    expect(of("unrelated_words", "I have a dog.")).toBe(false);
    expect(of("not_understood", "My dog is big.")).toBe(false);
    expect(of("unrelated_words", "Blue car.")).toBe(true);
    expect(of("not_understood", "I don't know.")).toBe(true);
  });

  it("정규화: 대본 2회차 장면('I have a dog.' · 'Yes big fish.' · 'Rice.')은 AI 가 막힘이라 해도 막힘이 아니고 답함 계획 칸을 남기며, 'Huh?' 는 막힘이다", () => {
    const dog = norm({ child_kind: "new_topic", stuck: true }, "I have a dog.");
    expect(dog.stuck).toBe(false);
    expect(dog.child_kind).toBe("new_topic");
    expect(dog.next_move).toBe("follow_child");
    expect(dog.child_topic).toBe(true);
    // 갈래 칸이 없어도(옛 꼴 응답) 영어 말이면 막힘이 아니다
    const { child_kind: _drop, ...noKind } = answer({ stuck: true });
    expect(norm(noKind, "Yes big fish.").stuck).toBe(false);
    expect(
      norm({ child_kind: "short_related", stuck: true }, "Rice.").stuck,
    ).toBe(false);
    const huh = norm({ child_kind: "not_understood", stuck: true }, "Huh?");
    expect(huh.stuck).toBe(true);
    expect(huh.next_move).toBe("none");
  });

  it("흘려 받기: child_kind 칸이 stuck 앞에 와도 흘려 보내고 갈래 글을 읽는다", () => {
    const reader = createToriEnReader();
    const first = reader.push(
      '{"child_kind":"new_topic","stuck":true,"tori_en":"Oh, a dog! Is',
    );
    expect(reader.failed()).toBe(false);
    expect(reader.childKind()).toBe("new_topic");
    expect(reader.stuck()).toBe(true);
    expect(first).toEqual(["Oh, a dog!"]);
    // stuck 뒤에 오는 child_kind 는 받지 않는다(칸 차례)
    const late = createToriEnReader();
    late.push('{"stuck":true,"child_kind":"answer","tori_en":"Hi. "');
    expect(late.failed()).toBe(true);
  });

  it("막힘을 무른 턴은 통째로 다시 쓰게 한다: 다시 쓰기 메시지에 아이 말 · 막힘 아님 · 이어 묻기를 알리고, 다시 쓴 반응과 질문이 앞 응답을 대신한다", async () => {
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
    const options = {
      sentenceMaxWords: 8,
      allowedWords: new Set(
        "oh a dog is your big that okay let's say it together do you like".split(
          " ",
        ),
      ),
      unitWords: NEW3,
      childWords: ["dog"],
      teacherName: "Mina",
      lemmaOf: () => undefined,
      forms: [],
      allowedForms: new Set<string>(),
    };
    const ok = (value: TalkLessonOutput): LessonOutcomeView => ({
      kind: "ok",
      value,
      hintsBlocked: false,
      overLength: 0,
    });
    const settle = (out: Awaited<ReturnType<typeof withQuestionRetry>>) =>
      settleLessonTurn({
        flow: out.flow,
        outcome: out.view,
        ctx: {
          card: CARD3,
          turns: a.turns,
          asked,
          max: LOW.sameQuestionMax,
          low: true,
          koMeaning: true,
          dropped: [],
          spec: SPEC3,
          lineOptions: options,
        },
      });
    const notes: string[] = [];
    const first = flowOf(["That's okay!", "Let's say it together."]);
    const out = await withQuestionRetry({
      flow: first,
      view: ok(answer({ tori_en: "That's okay! Let's say it together." })),
      lineOptions: options,
      sentenceMaxWords: 8,
      rewrite: { child: "I have a dog." },
      retry: async ({ note }) => {
        notes.push(note);
        const again = flowOf(["Oh, a dog!", "Is your dog big?"]);
        return {
          value: answer({ tori_ko: ["오, 강아지!", "강아지 커?"] }),
          entries: again.entries(),
          hintsBlocked: false,
          overLength: 0,
          blocked: 0,
        };
      },
    });
    expect(notes).toEqual([stuckRewriteNoteOf("I have a dog.")]);
    expect(notes[0]).toContain('"I have a dog."');
    expect(notes[0]).toContain("stuck false");
    const result = settle(out);
    expect(result.release).toEqual(["Oh, a dog!", "Is your dog big?"]);
    expect(result.kept).toEqual(["Oh, a dog!", "Is your dog big?"]);
    expect(result.ko).toBe("오, 강아지! 강아지 커?");
    // 다시 쓰지 못하면(응답 없음 · 질문 없는 다시 쓰기 · 시간 없음) 막힘 꼴 앞 응답은 하나도 내보내지 않고 카드 자리(카드 질문)로 차례를 잇는다 —
    // 질문 없이 끝나지 않는다(검토 rev-prompt-2 B — 실제 앞 응답 꼴 'That's okay! Let's say it together. Listen and say!')
    const stuckLike = [
      "That's okay!",
      "Let's say it together.",
      "Listen and say!",
    ];
    for (const [canRetry, again] of [
      [true, null],
      [true, ["Oh, a dog!", "Nice!"]],
      [false, null],
    ] as const) {
      const fallback = await withQuestionRetry({
        flow: flowOf(stuckLike),
        view: ok(answer({ tori_en: stuckLike.join(" "), model_line: "" })),
        lineOptions: options,
        sentenceMaxWords: 8,
        canRetry,
        rewrite: { child: "I have a dog." },
        retry: async () =>
          again === null
            ? null
            : {
                value: answer({ tori_ko: [] }),
                entries: flowOf([...again]).entries(),
                hintsBlocked: false,
                overLength: 0,
                blocked: 0,
              },
      });
      const result = settle(fallback);
      expect(result.release).toEqual([]);
      expect(result.kept).toEqual([]);
      expect(result.plan.kind).toBe("card_slot");
      expect(result.replaced).toBe("fail");
      const questions = result.attach.filter((l) => l.kind === "question");
      expect(questions).toHaveLength(1);
    }
  });
});

describe("I-4 설명 · 뜻의 영어 문장 거름(13절 C204 (4))", () => {
  it("영어 낱말이 둘 이상 이어진 문장(따옴표 안 포함)은 빼고, 영어 낱말 하나와 뜻은 남긴다", () => {
    expect(
      withoutEnglishSentencesOf(
        "괜찮아! 'I eat rice.'처럼 말해 봐. '먹다'는 eat 이야.",
      ),
    ).toBe("괜찮아! '먹다'는 eat 이야.");
    expect(withoutEnglishSentencesOf("We eat rice and fish.")).toBe("");
    expect(withoutEnglishSentencesOf("{NAME}, 잘했어!")).toBe(
      "{NAME}, 잘했어!",
    );
  });

  it("1~3단계 정규화는 설명과 뜻 문장마다 영어 문장을 걸러 내고(뜻 자리는 남김), 4단계부터는 그대로다", () => {
    const value = {
      explanation: "괜찮아! 'We eat rice.'라고 하면 돼. '먹다'는 eat 이야.",
      tori_ko: ["오, 강아지!", "'My dog is big.' 이라고 해 봐."],
    };
    const three = norm(value, "I have a dog.");
    expect(three.explanation).toBe("괜찮아! '먹다'는 eat 이야.");
    expect(three.tori_ko).toEqual(["오, 강아지!", ""]);
    const four = norm(value, "I have a dog.", 4);
    expect(four.explanation).toBe(value.explanation);
  });
});

describe("I-1 받침 닫기 · 들리지 않음 차례의 따라 말하기 신호 말(13절 C204 (5))", () => {
  const a: LessonArgs = {
    spec: SPEC3,
    card: CARD3,
    newWords: NEW3,
    turns: [...opening3(), said()],
    segment: "talk",
    settings: LOW,
    prepWords: CARD3.prep ?? [],
  };
  const base = nextTeacherTurnOf(a);
  const accept = (over: Partial<typeof base>, en: string) => {
    const flow = createLessonSentenceFlow({
      low: true,
      ifAnswered: {
        ...base,
        kind: "card_slot",
        aiAsks: false,
        attach: [{ kind: "sound", role: "answer", en: "I play." }],
        ...over,
      },
      ifStuck: null,
      asked: new Map(),
      max: LOW.sameQuestionMax,
    });
    flow.stuck(false);
    return flow.accept(en);
  };

  it("받침 셋째(닫기) · 들리지 않음 차례는 'say it together' 꼴 신호 말을 지우고, 받침 첫째도 AI 가 쓴 신호 말은 지운다('AI 몫 넓힘' C207 — 앱이 붙임)", () => {
    expect(
      accept({ stage: 3, cause: "button" }, "Let's say it together."),
    ).toBe("drop");
    expect(accept({ stage: 0, cause: "nospeech" }, "Listen and say!")).toBe(
      "drop",
    );
    expect(accept({ stage: 3, cause: "button" }, "That's okay!")).toBe("send");
    expect(
      accept({ stage: 1, cause: "button" }, "Let's say it together."),
    ).toBe("drop");
  });
});

describe("I-2 카드 답 뒤 필수 질문 되돌림(13절 C204 (6))", () => {
  it("'Previous turn was a card chance: yes' 턴의 필수 질문 갈래는 이어 묻기로 되돌리되 카드 항목은 남긴다(들린 필수 질문은 다룬 것, 검토 rev-prompt-2 E), 그 밖은 그대로", () => {
    expect(
      cardChainGuardOf({ nextMove: "required", afterCardChance: true }),
    ).toEqual({ nextMove: "follow_up", dropCardItem: false, chained: true });
    expect(
      cardChainGuardOf({ nextMove: "required", afterCardChance: false }),
    ).toEqual({ nextMove: "required", dropCardItem: false, chained: false });
    expect(
      cardChainGuardOf({ nextMove: "follow_up", afterCardChance: true }),
    ).toEqual({ nextMove: "follow_up", dropCardItem: false, chained: false });
    // 갈래를 follow_up 으로 적고 카드 항목만 필수 질문인 꼴도 본다(대본 4회차 N-2 (b))
    expect(
      cardChainGuardOf({
        nextMove: "follow_up",
        cardItemKind: "required",
        afterCardChance: true,
      }),
    ).toEqual({ nextMove: "follow_up", dropCardItem: true, chained: true });
    const input = lessonInput(3, { turn: { afterCardChance: true } });
    const out = normalizeTalkLesson(
      answer({
        tori_en: "Yum! What sport is fun?",
        next_move: "required",
        card_item: { kind: "required", no: 2 },
        next_targets: ["soccer"],
      }),
      input,
      lessonRules(3),
    );
    expect(out?.next_move).toBe("follow_up");
    expect(out?.card_item).toEqual({ kind: "required", no: 2 });
  });
});

describe("고정부 · 응답 칸 문장(고침 2)", () => {
  const system = talkLessonSystem(lessonInput(3), lessonRules(3));

  it("C-1 막힘 경계 문장과 'If stuck' 은 비상 계획이라는 문장, child_kind 칸 설명", () => {
    expect(system).toContain(
      "Decide child_kind first, then stuck. stuck is true only for not_understood or unrelated_words. A meaningful English sentence is never stuck: if it answers the question it is answer; if it is about something else it is new_topic, so react and follow it (next_move follow_child), e.g. 'I have a dog.' or 'My dog is big.'.",
    );
    expect(system).toContain(
      "One word from the question or today's scene is never stuck: it is answer or short_related, so say back one correct sentence with it, e.g. 'Rice.' -> 'You eat rice!' or 'Cold.' -> 'Yes, the juice is cold!'.",
    );
    expect(system).toContain(
      "The 'If stuck' lines are only a backup; most answers are not stuck.",
    );
    const wire = JSON.stringify(
      z.toJSONSchema(
        talkLessonTurnSpec.wireSchema(lessonInput(3), lessonRules(3)),
      ),
    );
    expect(wire).toContain(
      "new_topic: a meaningful sentence about something else",
    );
    expect(wire).toContain(
      "True only when child_kind is not_understood or unrelated_words",
    );
  });

  it("I-4 · M-3 설명 · 뜻에 영어 문장 금지와 평하지 않기, I-1 받침 1 · 3 예 나눔, I-2 필수 질문 금지", () => {
    expect(system).toContain(
      "At levels 1-3, never write an English sentence or the English answer in letters in explanation and tori_ko (the app plays the English as sound); one English word with its Korean meaning is fine. At every level, never say the child's words were wrong or not a right answer.",
    );
    // 'AI 몫 넓힘'(C209): 1~3단계 받침 카드 자리의 말은 고정 문장 대신 자리마다 꼴을 나눈 자기 말(같이 말하자는 안내는 앱 신호 말)
    expect(system).toContain(
      "at Support stage 1 an okay reaction and a short cheer (the app says the cue to say it together, so do not say it);",
    );
    expect(system).toContain(
      "at Support stage 3 or after nospeech an okay reaction and a line that you will play the answer and go on (never ask the child to say it or repeat it).",
    );
    expect(system).toContain(
      "In this turn next_move can never be required, and card_item can never be a required question either.",
    );
  });

  it("M-1 인사 끝 예 · 뜻 말투, M-2 들리지 않음 카드 자리, M-4 바른 말 바꾸지 않기, M-7 힌트는 자기 질문의 답, I-5 반응 예 둘", () => {
    // 1~3단계 인사 끝 예는 고정부 목록이 아니라 사용자 메시지 'Example line' 한 줄(대본 회차 r1 판정 I-1 (가))
    expect(system).not.toContain("'Yay! New words time!'");
    expect(system).toContain(
      "the 'Example line' in the message shows only the kind of line for this place",
    );
    expect(system).toContain("(e.g. '다행이다!', '잘 지냈다니 좋다!')");
    expect(system).toContain(
      "When Turn is card_slot after nospeech, write only that short line: no answer and no question.",
    );
    expect(system).toContain(
      "If the child's sentence is already correct, do not change its words (never swap in a unit word); do not say it back, just react to it.",
    );
    expect(system).toContain(
      "the hints and the answer example answer your own next question, not an earlier card question.",
    );
    expect(system).toContain("(e.g. 'Oh, soccer!', 'Me too!', 'Yum!')");
  });
});

describe("CI 통합 16건(b462c21) — 턴 길 설정 읽기", () => {
  it("회화 턴 길의 설정 읽기(turnSettings)에 선생님 문장 상한 키 넷이 들어 있어, 그 키만으로 teacherSentencesMaxOf 가 단계마다 읽힌다(빠지면 CallSettingError 로 턴이 오류)", () => {
    const keys = Object.keys(TEACHER_SENTENCES_SETTING_SCHEMAS);
    expect(keys).toHaveLength(4);
    for (const key of keys) expect(Object.keys(turnSettings)).toContain(key);
    const only = Object.fromEntries(
      Object.keys(turnSettings).map((k) => [k, values[k]]),
    );
    for (const level of [1, 3, 4, 7, 10])
      expect(teacherSentencesMaxOf(only, level)).toBeGreaterThan(0);
  });
});

describe("고침 2 fix 1(검토 rev-prompt-2 A · C · E)", () => {
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
    return flow.entries();
  };

  it("A 통째로 다시 쓴 턴은 갈래 · 막힘만 앞 응답 값이고 '말함' · 목표 근거 · 되풀이 · 아이 이야기 칸은 다시 쓴 응답 값이다(질문만 다시 쓴 턴은 앞 응답 값)", () => {
    const first = answer({
      child_kind: "new_topic",
      stuck: false,
      self_used_words: [],
      goal_suggest: [],
      recast: "",
      child_topic: false,
    });
    const retry = answer({
      child_kind: "not_understood",
      stuck: true,
      self_used_words: ["dog"],
      goal_suggest: [{ goal: GOAL_1, why_ko: "개를 키운다고 말했다" }],
      recast: "I have a dog.",
      child_topic: true,
    });
    const held = entriesOf(["That's okay!"]).map((e) => ({
      ...e,
      state: "held" as const,
    }));
    const whole = mergeQuestionRetry({
      first,
      firstEntries: held,
      retry,
      retryEntries: entriesOf(["Oh, a dog!", "Is your dog big?"]),
      whole: true,
    });
    expect(whole?.value.child_kind).toBe("new_topic");
    expect(whole?.value.stuck).toBe(false);
    expect(whole?.value.self_used_words).toEqual(["dog"]);
    expect(whole?.value.goal_suggest).toHaveLength(1);
    expect(whole?.value.recast).toBe("I have a dog.");
    expect(whole?.value.child_topic).toBe(true);
    const part = mergeQuestionRetry({
      first,
      firstEntries: entriesOf(["Nice!", "Do you like basketball?"]),
      retry,
      retryEntries: entriesOf(["Oh!", "Is your dog big?"]),
    });
    expect(part?.value.self_used_words).toEqual([]);
    expect(part?.value.recast).toBe("");
  });

  it("C 잡아 두기: 앱이 막힘을 물렀고 · 보낸 문장이 없고 · 1~3단계 범위를 읽었고 · 질문 차례일 때만 잡아 두고, 시도마다 덮어쓴다", () => {
    const hold = createRewriteHold({ low: true, rangeOk: true });
    hold.onStuck(true, true);
    expect(hold.holding()).toBe(true);
    expect(hold.sends(true)).toBe(false);
    // 다음 시도가 막힘을 무르지 않으면 덮어써 보낸다
    hold.onStuck(false, true);
    expect(hold.holding()).toBe(false);
    expect(hold.sends(true)).toBe(true);
    expect(hold.sends(false)).toBe(false);
    // 이미 보낸 문장이 있으면 무른 시도도 잡아 두지 않는다
    hold.onStuck(true, true);
    expect(hold.holding()).toBe(false);
    for (const [low, rangeOk, asks] of [
      [false, true, true],
      [true, false, true],
      [true, true, false],
    ] as const) {
      const other = createRewriteHold({ low, rangeOk });
      other.onStuck(true, asks);
      expect(other.holding(), `${low} ${rangeOk} ${asks}`).toBe(false);
    }
  });

  it("E 카드 항목을 쓴 차례는 갈래가 이어 묻기여도 이어 묻기 뒤 셈을 0 으로 돌리지 않는다(되돌린 필수 질문)", () => {
    const turns = [
      ...opening3(),
      said(),
      aiTurn("Yum! What sport is fun?", {
        next: "follow_up",
        item: { kind: "required", no: 2 },
        words: ["soccer"],
      }),
      said(),
    ];
    // 대화 첫 질문(1) + 되돌린 필수 질문 차례(1) = 2
    expect(
      talkLessonPositionOf({ ...a, turns }).teacherTurnsSinceFollowUp,
    ).toBe(2);
  });
});

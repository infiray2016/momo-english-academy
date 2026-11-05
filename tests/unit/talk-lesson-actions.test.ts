// 회화 수업 새 갈래 액션 · 화면 자료의 순수 몫(회화 plan 묶음 9 — 토막 넘김 · 짧은 준비 저장 · 고르기 · 확인 조건 · 대화 기록 자료 ·
// 들려줄 말 출처). DB 를 거치는 길(처음 스냅숏 · 행 넣기 · 참여 완료 · 끝맺음 기록)은 통합 시험(tests/integration/talk-lesson-session.test.ts,
// 정적)이 본다. 증명: AC-15f · AC-15t(단위 몫) · AC-16a(끝난 길과 친한 정도가 오르는 때) · AC-12h(영어로 말한 문장 셈).
import { describe, expect, it } from "vitest";
import { NOW_LETS_TALK, teacherMoveOf } from "@/core/conversation/lesson-flow";
import type {
  TalkLessonCard,
  TalkLessonTurn,
} from "@/core/conversation/lesson-turns";
import { talkMoveOf } from "@/core/conversation/move";
import type { TalkLevelSpec } from "@/core/seed/schema/reference";
import {
  followSentenceDelta,
  type LessonCore,
  lessonAdvanceOf,
  lessonFollowOf,
  lessonHintTextOf,
  lessonHintViewsOf,
  lessonLogOf,
  lessonMoreOf,
  lessonPositionOf,
  lessonStepOf,
  lessonStopOf,
  NOW_LETS_TALK_KO,
  prepModelLineOf,
  prepNoteOf,
} from "@/server/conversation";
import type { TalkTurnRow } from "@/server/conversation/state";
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

const PLAN3 = ["play", "soccer", "sunday"];

function core3(over: Partial<LessonCore> = {}): LessonCore {
  return {
    spec: SPEC3,
    card: CARD3,
    newWords: NEW3,
    turns: opening3(),
    segment: "talk",
    settings: LOW,
    prepWords: PLAN3,
    prepPlan: PLAN3,
    status: "in_progress",
    orphan: false,
    todayWordCount: NEW3.length,
    ...over,
  };
}

/** 인사 둘과 인사 끝 반응까지(대화 첫 질문 전). */
const greeted3 = (): TalkLessonTurn[] => opening3().slice(0, -1);

/** 4단계 인사 · 대화 첫 질문 뒤 막힌 차례 둘 · 대화 중 연 짧은 준비 행. */
function prepOpened4(): TalkLessonTurn[] {
  return [
    teacher("Hi! How was your day?", { kind: "first_question" }),
    said({ segment: "greeting" }),
    aiTurn("Good!"),
    teacher("What is your favorite subject?", {
      kind: "first_question",
      item: { kind: "required", no: 1 },
      words: ["math"],
    }),
    button(),
    aiTurn("That's okay! Do you like math?", { stage: 1 }),
    button(),
    teacher("I like math.", {
      kind: "card_slot",
      why: "support",
      stage: 3,
      app: ["answer_example", "prep"],
      prep: { words: ["difficult", "math"] },
    }),
  ];
}

function core4(over: Partial<LessonCore> = {}): LessonCore {
  return {
    spec: SPEC4,
    card: CARD4,
    newWords: NEW4,
    turns: prepOpened4(),
    segment: "talk",
    settings: MID,
    prepWords: [],
    prepPlan: [],
    status: "in_progress",
    orphan: false,
    todayWordCount: NEW4.length,
    ...over,
  };
}

const closingSlot = () =>
  teacher("Great talk! Do you want to talk more?", { kind: "closing_slot" });
const suggestion = () =>
  aiTurn("That was fun. Shall we stop here?", { next: "closing" });

describe("아이가 할 일(화면 자료 step)", () => {
  it("인사를 다 하면 짧은 준비 계획이 있을 때 짧은 준비로, 없으면 대화로 넘긴다(C33)", () => {
    expect(
      lessonStepOf(core3({ turns: greeted3(), segment: "greeting" })),
    ).toEqual({ kind: "advance", to: "prep" });
    expect(
      lessonStepOf(
        core3({
          turns: greeted3(),
          segment: "greeting",
          prepPlan: [],
          prepWords: [],
        }),
      ),
    ).toEqual({ kind: "advance", to: "talk" });
  });

  it("짧은 준비 토막 · 대화 중 연 준비는 쪽지, 질문 뒤는 아이 차례, 고르기 · 닫힘 · 끊긴 아이 행을 가른다", () => {
    expect(
      lessonStepOf(
        core3({ turns: greeted3(), segment: "prep", prepWords: [] }),
      ),
    ).toEqual({ kind: "prep", place: "greeting" });
    expect(lessonStepOf(core4())).toEqual({ kind: "prep", place: "talk" });
    expect(lessonStepOf(core3())).toEqual({ kind: "child" });
    expect(
      lessonStepOf(core3({ turns: [...opening3(), said(), closingSlot()] })),
    ).toEqual({ kind: "choice", choice: "closing" });
    expect(
      lessonStepOf(core3({ turns: [...opening3(), said(), suggestion()] })),
    ).toEqual({ kind: "choice", choice: "suggestion" });
    expect(lessonStepOf(core3({ segment: "wrap_up" }))).toEqual({
      kind: "closed",
    });
    expect(lessonStepOf(core3({ orphan: true }))).toEqual({ kind: "retry" });
  });
});

describe("토막 넘김(advanceTalk 새 갈래)", () => {
  it("인사 → 짧은 준비는 질문 없이 토막만 바꾸고, 계획이 있으면 인사에서 대화로 건너뛰지 않는다", () => {
    const greeting = core3({
      turns: greeted3(),
      segment: "greeting",
      prepWords: [],
    });
    expect(lessonAdvanceOf(greeting, "prep")).toEqual({
      ok: true,
      segment: "prep",
      plan: null,
    });
    expect(lessonAdvanceOf(greeting, "talk")).toEqual({ ok: false });
  });

  it("짧은 준비 → 대화는 카드 첫 필수 질문을 앱이 붙이는 대화 첫 질문 차례다(AI 없음, C19)", () => {
    const out = lessonAdvanceOf(
      core3({ turns: greeted3(), segment: "prep" }),
      "talk",
    );
    if (!out.ok || !out.plan) throw new Error("넘김이어야 한다");
    expect(out.segment).toBe("talk");
    expect(out.plan.kind).toBe("first_question");
    expect(out.plan.callsAi).toBe(false);
    expect(out.plan.item).toEqual({ kind: "required", no: 1 });
    // 대화 첫 질문 행의 move 는 붙인 필수 질문의 노린 단어를 싣는다(검토 M-4)
    expect(teacherMoveOf(out.plan).words).toEqual(["play"]);
    expect(out.plan.attach).toEqual([
      expect.objectContaining({
        kind: "question",
        en: "What do you do on the weekend?",
        ko: "뜻 1",
      }),
    ]);
  });

  it("짧은 준비 계획이 없으면(다지기 · 4단계) 인사 끝에서 바로 대화 첫 질문이다", () => {
    const out = lessonAdvanceOf(
      core3({
        turns: greeted3(),
        segment: "greeting",
        prepPlan: [],
        prepWords: [],
      }),
      "talk",
    );
    expect(out.ok && out.plan?.kind).toBe("first_question");
  });

  it("대화 중 연 준비가 끝나면 'Now let's talk.' 뒤 다음 필수 질문이고 이어진 막힘 셈은 0, 토막은 그대로다(3.3 (나))", () => {
    const out = lessonAdvanceOf(core4(), "talk");
    if (!out.ok || !out.plan) throw new Error("넘김이어야 한다");
    expect(out.segment).toBe("talk");
    expect(out.plan.attach[0]).toEqual({ kind: "app_line", en: NOW_LETS_TALK });
    expect(out.plan.attach[1]).toEqual(
      expect.objectContaining({
        kind: "question",
        en: "Which class is hard?",
      }),
    );
    expect(out.plan.streak).toBe(0);
  });

  it("아이 차례 · 대화 중 · 닫힌 대화 · 끊긴 아이 행에서는 넘기지 않는다", () => {
    expect(lessonAdvanceOf(core3(), "talk")).toEqual({ ok: false });
    expect(lessonAdvanceOf(core3(), "prep")).toEqual({ ok: false });
    expect(
      lessonAdvanceOf(core3({ turns: [...opening3(), said()] }), "talk"),
    ).toEqual({ ok: false });
    expect(
      lessonAdvanceOf(
        core3({ turns: greeted3(), segment: "prep", orphan: true }),
        "talk",
      ),
    ).toEqual({ ok: false });
    expect(lessonAdvanceOf(core3({ segment: "wrap_up" }), "talk")).toEqual({
      ok: false,
    });
  });
});

describe("짧은 준비 · 정리 따라 말하기 저장(saveFollowAlong 새 갈래)", () => {
  const spoken = { target: "I play.", heard: ["I play."], failures: 0 };

  it("인사 뒤 준비는 계획 낱말을 쪽지 차례로 talk-prep(자리 greeting)에 넣고 활동 번호는 처음 스냅숏 뒤부터다", () => {
    const at = core3({ turns: greeted3(), segment: "prep", prepWords: [] });
    const out = lessonFollowOf(at, { segment: "prep", index: 1, ...spoken }, 2);
    expect(out).toEqual({
      activityNo: 3,
      input: {
        v: 1,
        kind: "talk-prep",
        step: "final",
        target: "I play.",
        heard: ["I play."],
        failures: 0,
        index: 1,
        word: "soccer",
        place: "greeting",
      },
      met: ["soccer"],
    });
    expect(
      lessonFollowOf(at, { segment: "prep", index: 3, ...spoken }, 2),
    ).toBeNull();
  });

  it("C149 따라 말하기 시도의 입력에는 화면이 보낸 듣기 사건 요약(clientListen)이 그대로 실리고 인식 글 밖의 글은 들지 않는다", () => {
    const clientListen = {
      br: "iPad Safari 27.0",
      r3d: false,
      listens: [{ o: "result", by: "silence" as const, d: 1200, snd: true }],
      mf: 0,
    };
    const at = core3({ turns: greeted3(), segment: "prep", prepWords: [] });
    const out = lessonFollowOf(
      at,
      { segment: "prep", index: 1, ...spoken, clientListen },
      2,
    );
    expect(out?.input).toEqual(expect.objectContaining({ clientListen }));
    const stored = (out?.input as { clientListen?: unknown } | undefined)
      ?.clientListen;
    expect(stored).toEqual(clientListen);
    expect(JSON.stringify(stored)).not.toContain(spoken.target);
    const wrap = lessonFollowOf(
      core3({ segment: "wrap_up" }),
      { segment: "wrap_up", index: 0, ...spoken, clientListen },
      2,
    );
    expect(wrap?.input).toEqual(
      expect.objectContaining({ kind: "talk-wrapup", clientListen }),
    );
  });

  it("따라 말하지 못한 낱말(인식 글 없음 · 건너뜀)은 시도만 남고 만남이 아니다", () => {
    const at = core3({ turns: greeted3(), segment: "prep", prepWords: [] });
    const out = lessonFollowOf(
      at,
      {
        segment: "prep",
        index: 0,
        target: "I play.",
        heard: [],
        failures: 3,
        skipped: "recognition",
      },
      2,
    );
    expect(out?.input).toEqual(
      expect.objectContaining({ skipped: "recognition", word: "play" }),
    );
    expect(out?.met).toEqual([]);
  });

  it("대화 중 연 준비는 그 선생님 행 move.prep 낱말을 자리 talk 로 넣는다", () => {
    const out = lessonFollowOf(
      core4(),
      { segment: "prep", index: 1, ...spoken },
      1,
    );
    expect(out?.input).toEqual(
      expect.objectContaining({
        kind: "talk-prep",
        word: "math",
        place: "talk",
        index: 1,
      }),
    );
    expect(out?.activityNo).toBe(3);
  });

  it("다지기 · 보강 카드(오늘 쓸 말 0)도 talk.prep_words.<구간> 개까지 활동 번호를 받는다(fix 1 I-1)", () => {
    const out = lessonFollowOf(
      core3({
        turns: greeted3(),
        segment: "prep",
        prepWords: [],
        todayWordCount: 0,
      }),
      { segment: "prep", index: 2, ...spoken },
      2,
    );
    expect(out?.activityNo).toBe(2 + 2);
  });

  it("준비 토막이 아니면 짧은 준비를, 정리 토막이 아니면 정리 · 한 번 더를 받지 않는다", () => {
    expect(
      lessonFollowOf(core3(), { segment: "prep", index: 0, ...spoken }, 2),
    ).toBeNull();
    expect(
      lessonFollowOf(core3(), { segment: "wrap_up", index: 0, ...spoken }, 2),
    ).toBeNull();
    const wrap = core3({ segment: "wrap_up" });
    const prepRange = Math.max(NEW3.length, LOW.prepWords);
    expect(
      lessonFollowOf(wrap, { segment: "wrap_up", index: 1, ...spoken }, 2)
        ?.activityNo,
    ).toBe(2 + prepRange + NEW3.length + 1);
    expect(
      lessonFollowOf(wrap, { segment: "wrap_up", index: 2, ...spoken }, 2),
    ).toBeNull();
    expect(
      lessonFollowOf(wrap, { segment: "again", index: 0, ...spoken }, 2)?.input
        .kind,
    ).toBe("talk-again");
  });

  it("AC-12h: 인식 글이 있는 발화마다 영어로 말한 문장 하나, 인식 글이 없는 시도는 0 이다", () => {
    const prep = [["I play."], ["Soccer."], ["Sunday."]];
    const total =
      prep.reduce((n, heard) => n + followSentenceDelta("prep", heard), 0) +
      followSentenceDelta("wrap_up", ["I play soccer on Sunday."]) +
      followSentenceDelta("prep", []);
    expect(total).toBe(4);
  });
});

describe("고르기(chooseMoreTalk 새 갈래, 정한 것 11)", () => {
  it("마무리 물음 뒤 '더 이야기하기'는 더 이야기하기 토막 · 더 이야기할 거리 카드 자리(AI 없음)이고 참여 완료다", () => {
    const at = core3({ turns: [...opening3(), said(), closingSlot()] });
    const out = lessonMoreOf(at);
    if (!out.ok) throw new Error("고를 차례여야 한다");
    expect(out.segment).toBe("more_talk");
    expect(out.complete).toBe(true);
    expect(out.move.kind).toBe("card_slot");
    expect(out.move.item.kind).toBe("more");
    const item = CARD3.more.find((m) => m.no === out.move.item.no);
    expect(out.line).toEqual({ en: item?.en, ko: item?.ko });
    expect(out.move.words).toEqual(item?.targets);
    // 넣은 뒤 되짚으면 마무리 물음에 답한 것이고 고르기 차례가 끝난다(턴 셈 없음)
    const after = lessonPositionOf({
      ...at,
      segment: "more_talk",
      turns: [
        ...at.turns,
        { speaker: "teacher", text: out.line.en, move: out.move },
      ],
    });
    expect(after.choice).toBeNull();
    expect(after.closingAnswered).toBe(true);
    expect(after.talkCount).toBe(lessonPositionOf(at).talkCount);
  });

  it("다시 쓰기가 남은 낱말을 노리는 더 이야기할 거리를 먼저 붙인다", () => {
    const out = lessonMoreOf(
      core3({ turns: [...opening3(), said(), closingSlot()] }),
    );
    // 대화 첫 질문이 play 를 노렸으니 play 의 더 이야기할 거리(1번)가 다시 쓰기 기회다
    expect(out.ok && out.move.item).toEqual({ kind: "more", no: 1 });
  });

  it("이미 참여 완료인 세션(더 이야기하기 한 번 뒤 다시 마무리 물음)은 다시 완료하지 않는다(AC-16a 한 번)", () => {
    const out = lessonMoreOf(
      core3({
        turns: [...opening3(), said(), closingSlot()],
        status: "completed",
      }),
    );
    expect(out.ok && out.complete).toBe(false);
  });

  it("마무리 제안 뒤 '더 이야기하기'는 토막 그대로 대화를 잇고 참여 완료가 아니다", () => {
    const out = lessonMoreOf(
      core3({ turns: [...opening3(), said(), suggestion()] }),
    );
    expect(out.ok && out.segment).toBe("talk");
    expect(out.ok && out.complete).toBe(false);
  });

  it("고를 차례가 아니면 받지 않는다", () => {
    expect(lessonMoreOf(core3())).toEqual({ ok: false });
    expect(
      lessonMoreOf(
        core3({ turns: [...opening3(), said(), closingSlot()], orphan: true }),
      ),
    ).toEqual({ ok: false });
  });
});

describe("그만하기(stopTalk 새 갈래, 정한 것 12 · AC-15t · AC-16a)", () => {
  const talked = (n: number): TalkLessonTurn[] => {
    const turns = opening3();
    for (let i = 0; i < n; i++) turns.push(said(), aiTurn(`Nice! Q${i}?`));
    return turns;
  };

  it("(가) 대화 토막에서 말로 8턴 뒤 카드 기회가 남은 채 그만하기는 확인 없이 참여 완료 · 별 1 · 친한 정도", () => {
    const out = lessonStopOf(core3({ turns: talked(8) }), false);
    expect(out).toEqual({
      kind: "end",
      end: {
        outcome: "completed",
        reason: "stop",
        stars: 1,
        friendship: true,
      },
      complete: true,
    });
  });

  it("(나) 인사만 하고 그만하기는 확인 쪽지, 확인하면 중단 · 별 없음 · 친한 정도 그대로", () => {
    expect(lessonStopOf(core3(), false)).toEqual({ kind: "needs_confirm" });
    expect(lessonStopOf(core3(), true)).toEqual({
      kind: "end",
      end: {
        outcome: "aborted",
        reason: "stop_confirmed",
        stars: 0,
        friendship: false,
      },
      complete: false,
    });
  });

  it("막힌 차례 · 들리지 않음만 있으면 참여가 거의 없음이고, 말 한 턴이면 확인 쪽지가 없다", () => {
    expect(
      lessonStopOf(
        core3({ turns: [...opening3(), stuckSaid(), aiTurn("Okay.")] }),
        false,
      ),
    ).toEqual({ kind: "needs_confirm" });
    expect(
      lessonStopOf(
        core3({ turns: [...opening3(), noSpeech(), aiTurn("Okay.")] }),
        false,
      ),
    ).toEqual({ kind: "needs_confirm" });
    expect(lessonStopOf(core3({ turns: talked(1) }), false).kind).toBe("end");
  });

  it("마무리 제안 · 마무리 물음의 두 버튼에서 그만하기는 그 까닭이고, 이미 완료면 다시 완료하지 않는다", () => {
    const fromSuggestion = lessonStopOf(
      core3({ turns: [...talked(3), said(), suggestion()] }),
      false,
    );
    expect(fromSuggestion.kind === "end" && fromSuggestion.end.reason).toBe(
      "suggestion",
    );
    const fromClosing = lessonStopOf(
      core3({ turns: [...talked(3), said(), closingSlot()] }),
      false,
    );
    expect(fromClosing).toEqual(
      expect.objectContaining({
        kind: "end",
        end: expect.objectContaining({ reason: "closing_question" }),
        complete: true,
      }),
    );
    const later = lessonStopOf(
      core3({
        turns: [...talked(3), said(), closingSlot()],
        status: "completed",
      }),
      false,
    );
    expect(later.kind === "end" && later.complete).toBe(false);
  });
});

describe("들려줄 말 출처(다지기 · 보강 짧은 준비, 회화 3단계 브리프 설계 검토 '구현하며 확인할 것' 2)", () => {
  it("품사 규칙: 동사 'I + 낱말.', 셀 수 있는 명사 'The + 낱말.', 셀 수 없는 말 · 동사를 겸한 명사는 낱말만, 그 밖은 없음", () => {
    expect(
      prepModelLineOf({
        word: "sleep",
        partsOfSpeech: ["verb"],
        forms: ["sleeps", "slept"],
      }),
    ).toBe("I sleep.");
    expect(
      prepModelLineOf({
        word: "beach",
        partsOfSpeech: ["noun"],
        forms: ["beaches"],
      }),
    ).toBe("The beach.");
    expect(
      prepModelLineOf({
        word: "rain",
        partsOfSpeech: ["noun", "verb"],
        forms: ["rains", "rained", "raining"],
      }),
    ).toBe("Rain.");
    expect(
      prepModelLineOf({ word: "air", partsOfSpeech: ["noun"], forms: [] }),
    ).toBe("Air.");
    expect(
      prepModelLineOf({
        word: "happy",
        partsOfSpeech: ["adjective"],
        forms: [],
      }),
    ).toBeNull();
  });

  it("(0) 카드 오늘 쓸 말 → (1) 같은 단원 배정 카드의 오늘 쓸 말 → (2) 품사 규칙 → (3) 낱말만 차례로 고른다", () => {
    const note = prepNoteOf(["sea", "beach", "air", "blue", "zzz"], {
      card: [
        {
          word: "sea",
          meaningKo: "바다",
          example: "We go to the sea.",
          modelLine: "The sea.",
        },
      ],
      unitCards: [
        [
          {
            word: "beach",
            meaningKo: "해변",
            example: "We go to the beach.",
            modelLine: "The beach.",
            imageKey: "beach",
          },
        ],
      ],
      vocab: new Map([
        [
          "beach",
          {
            meaning: "바닷가",
            example: null,
            partsOfSpeech: ["noun"],
            forms: ["beaches"],
            imageKey: null,
          },
        ],
        [
          "air",
          {
            meaning: "공기",
            example: "Fresh air.",
            partsOfSpeech: ["noun"],
            forms: [],
            imageKey: null,
          },
        ],
        [
          "blue",
          {
            meaning: "파란",
            example: null,
            partsOfSpeech: ["adjective"],
            forms: [],
            imageKey: "blue",
          },
        ],
      ]),
    });
    expect(note).toEqual([
      {
        word: "sea",
        meaningKo: "바다",
        example: "We go to the sea.",
        modelLine: "The sea.",
        source: "card",
      },
      {
        word: "beach",
        meaningKo: "해변",
        example: "We go to the beach.",
        modelLine: "The beach.",
        imageKey: "beach",
        source: "unit_card",
      },
      {
        word: "air",
        meaningKo: "공기",
        example: "Fresh air.",
        modelLine: "Air.",
        source: "rule",
      },
      {
        word: "blue",
        meaningKo: "파란",
        example: "",
        modelLine: "blue",
        imageKey: "blue",
        source: "word",
      },
      {
        word: "zzz",
        meaningKo: "",
        example: "",
        modelLine: "zzz",
        source: "word",
      },
    ]);
  });
});

describe("대화 기록 자료(묶음 10 talkLogOf 의 재료, T2)", () => {
  const base = (over: Partial<TalkTurnRow>): TalkTurnRow =>
    ({
      id: "00000000-0000-4000-8000-000000000001",
      sessionId: "00000000-0000-4000-8000-000000000002",
      turnNo: 1,
      segment: "talk",
      clientAttemptId: null,
      speaker: "tori",
      text: null,
      inputMode: null,
      hintKind: null,
      hintLevel: null,
      heardHelp: null,
      targetWords: null,
      askKind: null,
      selfUsedWords: null,
      stuckPhrase: null,
      cardQuestionNo: null,
      saidWords: null,
      toriKo: null,
      recast: null,
      explanation: null,
      newWords: null,
      missionChecks: null,
      withinTarget: null,
      overLength: null,
      wordCount: null,
      sentUserMessage: null,
      toriRewrite: null,
      aiQuestion: null,
      perceivedWaitMs: null,
      listenEndSeconds: null,
      confirmSkipped: null,
      clientListen: null,
      move: null,
      recordedAt: new Date("2026-11-05T10:00:00+09:00"),
      ...over,
    }) as TalkTurnRow;

  it("선생님 행은 화면 글 줄(AI 글 · 앱이 붙인 카드 줄)과 뜻, 아이 행은 말 · '잘 모르겠어요' · 들리지 않음이고 소리 줄은 없다", () => {
    const log = lessonLogOf(
      [
        base({
          turnNo: 1,
          segment: "greeting",
          text: "\nHow are you today?",
          move: talkMoveOf({ kind: "first_question" }),
        }),
        base({
          turnNo: 1,
          segment: "greeting",
          speaker: "child",
          text: "I'm good.",
          inputMode: "speech",
        }),
        base({
          turnNo: 2,
          text: "Great!\nWhat do you do on the weekend?",
          toriKo: "좋아!",
          move: talkMoveOf({
            kind: "card_slot",
            item: { kind: "required", no: 1 },
            sound: { answer: "I'm good." },
          }),
        }),
        base({
          turnNo: 2,
          speaker: "child",
          text: null,
          inputMode: "dont_know",
        }),
        base({
          turnNo: 3,
          speaker: "child",
          text: null,
          inputMode: "dont_know",
          clientListen: { src: "nospeech" },
        }),
      ],
      { card: CARD3, koMeaning: true },
    );
    expect(log).toEqual([
      {
        speaker: "teacher",
        turnNo: 1,
        segment: "greeting",
        kind: "first_question",
        lines: [{ en: "How are you today?", ko: "오늘 기분 어때?", app: true }],
      },
      {
        speaker: "child",
        turnNo: 1,
        segment: "greeting",
        text: "I'm good.",
        input: "speech",
        nospeech: false,
        stuck: false,
      },
      {
        speaker: "teacher",
        turnNo: 2,
        segment: "talk",
        kind: "card_slot",
        lines: [
          { en: "Great!", ko: "좋아!", app: false },
          { en: "What do you do on the weekend?", ko: "뜻 1", app: true },
        ],
      },
      {
        speaker: "child",
        turnNo: 2,
        segment: "talk",
        text: null,
        input: "dont_know",
        nospeech: false,
        stuck: false,
      },
      {
        speaker: "child",
        turnNo: 3,
        segment: "talk",
        text: null,
        input: "dont_know",
        nospeech: true,
        stuck: false,
      },
    ]);
    // 1~3단계 소리 줄(move.sound — 받침의 답 'I'm good.')은 선생님 줄에 없다
    const teacherLines = log.flatMap((r) =>
      r.speaker === "teacher" ? r.lines.map((l) => l.en) : [],
    );
    expect(teacherLines).not.toContain("I'm good.");
  });

  it("5단계부터(뜻을 보이지 않는 단계)는 뜻이 없고, 마무리 물음 · 'Now let's talk.' 도 앱 줄로 남는다", () => {
    const log = lessonLogOf(
      [
        base({
          text: `Nice!\n${NOW_LETS_TALK}\nWhat is your favorite subject?\nDo you want to talk more?`,
          toriKo: "좋아!",
          move: talkMoveOf({ kind: "first_question" }),
        }),
      ],
      { card: CARD4, koMeaning: false },
    );
    expect(log[0]).toEqual(
      expect.objectContaining({
        lines: [
          { en: "Nice!", app: false },
          { en: NOW_LETS_TALK, app: true },
          { en: "What is your favorite subject?", app: true },
          { en: "Do you want to talk more?", app: true },
        ],
      }),
    );
  });
});

describe("힌트 단(새 꼴 세션 — AC-15a · AC-15p 서버 몫, 검토 I-1)", () => {
  const withHints = (
    items: TalkLessonCard["required"],
  ): TalkLessonCard["required"] =>
    items.map((i) => ({
      ...i,
      hintKo: `뜻 힌트 ${i.no}`,
      hints: [`I ___ ${i.no}.`, `I play ${i.no}.`],
    }));
  const card = {
    ...CARD3,
    required: withHints(CARD3.required),
    more: withHints(CARD3.more),
  } as TalkLessonCard;
  const spec = (over: Partial<TalkLevelSpec>) =>
    ({
      band: "1-3",
      targetTurns: 15,
      koMeaning: true,
      hintTiers: ["ko", "frame", "sentence"],
      usablePhrases: 0,
      ...over,
    }) as unknown as TalkLevelSpec;
  const stateOf = (
    over: Partial<LessonCore>,
    s: TalkLevelSpec,
    liveRows: TalkTurnRow[] = [],
  ) => {
    const core = core3({ card, ...over });
    return {
      spec: s,
      card,
      turns: core.turns,
      liveRows,
      position: lessonPositionOf(core),
    } as unknown as Parameters<typeof lessonHintViewsOf>[0];
  };

  it("AC-15p 3단계 카드 질문 자리는 한국어 뜻 → 영어 틀 → 영어 문장(듣기 단추) 단이고, 영어 단 글은 미리 내리지 않는다", () => {
    const state = stateOf({}, spec({}));
    expect(lessonHintViewsOf(state)).toEqual([
      { kind: "ko", text: "뜻 힌트 1" },
      { kind: "frame" },
      { kind: "sentence", listen: true },
    ]);
    expect(lessonHintTextOf(state, 0)).toBe("뜻 힌트 1");
    expect(lessonHintTextOf(state, 1)).toBe("I ___ 1.");
    expect(lessonHintTextOf(state, 2)).toBe("I play 1.");
    expect(lessonHintTextOf(state, 3)).toBeNull();
  });

  it("AC-15a 1단계는 한국어 뜻 → 영어 문장(듣기 단추) 두 단이다", () => {
    const state = stateOf({}, spec({ hintTiers: ["ko", "sentence"] }));
    expect(lessonHintViewsOf(state)).toEqual([
      { kind: "ko", text: "뜻 힌트 1" },
      { kind: "sentence", listen: true },
    ]);
    expect(lessonHintTextOf(state, 1)).toBe("I ___ 1.");
  });

  it("카드 항목이 없는 AI 차례 질문은 그 선생님 행 ai_question 의 AI 힌트를 쓰고, 4단계부터는 영어 단 글도 내린다", () => {
    const question = "What do you like to eat?";
    const turns = [...opening3(), said(), aiTurn(`Nice! ${question}`)];
    const row = {
      speaker: "tori",
      aiQuestion: {
        en: question,
        ko: "",
        answerExample: "I like pizza.",
        hintKo: "먹다",
        hints: ["I like ___.", "I like pizza."],
      },
    } as unknown as TalkTurnRow;
    const low = stateOf({ turns }, spec({}), [row]);
    expect(lessonHintViewsOf(low)).toEqual([
      { kind: "ko", text: "먹다" },
      { kind: "frame" },
      { kind: "sentence", listen: true },
    ]);
    expect(lessonHintTextOf(low, 2)).toBe("I like pizza.");
    const mid = stateOf(
      { turns },
      spec({ band: "4-6", hintTiers: ["ko", "frame", "sentence"] }),
      [row],
    );
    expect(lessonHintViewsOf(mid)).toEqual([
      { kind: "ko", text: "먹다" },
      { kind: "frame", text: "I like ___." },
      { kind: "sentence", text: "I like pizza." },
    ]);
  });

  it("힌트가 없는 자리(AI 힌트도 없음) · 열린 질문 자리가 없으면 단이 없다", () => {
    const turns = [...opening3(), said(), aiTurn("Nice! What else?")];
    expect(lessonHintViewsOf(stateOf({ turns }, spec({})))).toEqual([]);
    expect(
      lessonHintViewsOf(stateOf({ turns: [...opening3(), said()] }, spec({}))),
    ).toEqual([]);
    expect(lessonHintTextOf(stateOf({ turns }, spec({})), 0)).toBeNull();
  });
});

describe("'Now let's talk.' 의 뜻(검토 M-1)", () => {
  it("1~4단계 대화 기록의 넘어가는 말에도 한국어 뜻이 붙는다", () => {
    const [row] = lessonLogOf(
      [
        {
          id: "00000000-0000-4000-8000-000000000001",
          turnNo: 4,
          segment: "talk",
          speaker: "tori",
          text: `\n${NOW_LETS_TALK}\nWhat sport is fun?`,
          toriKo: null,
          move: talkMoveOf({ kind: "first_question" }),
        } as unknown as TalkTurnRow,
      ],
      { card: CARD3, koMeaning: true },
    );
    expect(NOW_LETS_TALK_KO).toBe("이제 이야기해 보자!");
    expect(row?.speaker === "teacher" && row.lines).toEqual([
      { en: NOW_LETS_TALK, ko: NOW_LETS_TALK_KO, app: true },
      { en: "What sport is fun?", ko: "뜻 2", app: true },
    ]);
  });
});

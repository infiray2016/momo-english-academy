// 회화 Claude 주도 묶음 S2 토막 접점의 순수 몫(spec '회화 Claude 주도' 설계 3 · AC-3 → 15절 AC-26c, 묶음 M 검토 M-3 → AC-26a).
// '더 이야기하기'의 새 엔진 결정(카드 거리 없이 토막 · 참여 완료만, 뜻은 기존 방식과 같음) · 방식은 처음 스냅숏 값 · 정리 되짚을 말 출처 ·
// 이어하기와 같은 시도 다시 흘림이 저장한 새 엔진 행을 그대로 다시 내는 것. DB 를 거치는 길은 tests/integration/talk-lead-segments.test.ts.
import { describe, expect, it } from "vitest";
import { type TalkLead, talkMoveOf } from "@/core/conversation/move";
import {
  type LessonCore,
  lessonAdvanceChoiceOf,
  lessonAdvanceLeadOf,
  lessonAdvanceOf,
  lessonLogOf,
  lessonMoreChoiceOf,
  lessonMoreLeadOf,
  lessonMoreOf,
  lessonStepOf,
  lessonWrapSourcesOf,
} from "@/server/conversation";
import { lessonReplayLinesOf } from "@/server/conversation/lesson-turn";
import type { TalkLessonState, TalkTurnRow } from "@/server/conversation/state";
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

const PLAN3 = ["play", "soccer", "sunday"];

/** 인사를 다 하고 대화 첫 질문 앞까지 온 3단계 행(opening3 에서 대화 첫 질문 행을 뺌). */
const greeted3 = () => opening3().slice(0, -1);

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

const closingSlot = () =>
  teacher("Great talk! Do you want to talk more?", { kind: "closing_slot" });
const suggestion = () =>
  aiTurn("That was fun. Shall we stop here?", { next: "closing" });

const atClosing = (over: Partial<LessonCore> = {}) =>
  core3({ turns: [...opening3(), said(), closingSlot()], ...over });
const atSuggestion = (over: Partial<LessonCore> = {}) =>
  core3({ turns: [...opening3(), said(), suggestion()], ...over });

type Start = NonNullable<TalkLessonState["start"]>;
const startOf = (over: Partial<Start> = {}): Start => ({
  metBefore: [],
  prepPlan: PLAN3,
  carry: { goals: [], words: [] },
  ...over,
});

const lead = (over: Partial<TalkLead> = {}): TalkLead => ({
  reading: "clear_answer",
  move: "react_and_follow_up",
  asked: [],
  said: [],
  ...over,
});

const row = (over: Partial<TalkTurnRow>): TalkTurnRow =>
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
    askAgain: null,
    move: null,
    recordedAt: new Date("2026-11-13T10:00:00+09:00"),
    ...over,
  }) as TalkTurnRow;

describe("AC-26c '더 이야기하기' 새 엔진 몫(묶음 S2)", () => {
  it("AC-26c 마무리 물음 · 마무리 제안 뒤 새 엔진은 카드 거리 없이 토막과 참여 완료만 정하고, 그 값은 기존 방식과 같다", () => {
    const cores = [
      atClosing(),
      atClosing({ status: "completed" }),
      atSuggestion(),
      atSuggestion({ status: "completed" }),
    ];
    for (const core of cores) {
      const app = lessonMoreOf(core);
      if (!app.ok) throw new Error("기존 방식이 받는 차례여야 한다");
      expect(lessonMoreLeadOf(core)).toEqual({
        ok: true,
        segment: app.segment,
        complete: app.complete,
      });
    }
    // 마무리 물음이면 더 이야기하기 토막과 참여 완료(02-2:294), 마무리 제안이면 토막 그대로 · 참여 완료 아님(02-2:295)
    expect(lessonMoreLeadOf(atClosing())).toEqual({
      ok: true,
      segment: "more_talk",
      complete: true,
    });
    expect(lessonMoreLeadOf(atSuggestion())).toEqual({
      ok: true,
      segment: "talk",
      complete: false,
    });
  });

  it("AC-26c 새 엔진은 카드의 더 이야기할 거리가 없어도 받는다(다음 말은 새 엔진이 쓴다)", () => {
    const card = { ...CARD3, required: [], more: [] };
    expect(lessonMoreOf(atClosing({ card }))).toEqual({ ok: false });
    expect(lessonMoreLeadOf(atClosing({ card }))).toEqual({
      ok: true,
      segment: "more_talk",
      complete: true,
    });
  });

  it("AC-26c 고를 차례가 아니면 새 엔진도 기존 방식과 같은 조건으로 받지 않는다", () => {
    const refused = [
      core3(),
      atClosing({ orphan: true }),
      atClosing({ segment: "wrap_up" }),
      core3({ turns: [...opening3(), said(), closingSlot(), said()] }),
    ];
    for (const core of refused) {
      expect(lessonMoreOf(core)).toEqual({ ok: false });
      expect(lessonMoreLeadOf(core)).toEqual({ ok: false });
    }
  });
});

describe("AC-26a 진행 중 수업의 방식은 처음 스냅숏 값(묶음 M 검토 M-3)", () => {
  it("AC-26a '더 이야기하기'의 방식은 처음 스냅숏의 leadMode 로 고르고 지금 설정 값(settings.leadMode)을 보지 않는다", () => {
    // 설정은 app 으로 바뀌었어도 claude 로 연 수업은 새 엔진
    const nowApp = atClosing({ settings: { ...LOW, leadMode: "app" } });
    expect(
      lessonMoreChoiceOf(
        { start: startOf({ leadMode: "claude" }), level: 1 },
        nowApp,
      ),
    ).toEqual({ mode: "claude", decision: lessonMoreLeadOf(nowApp) });
    // 설정은 claude 로 바뀌었어도 칸 없이(app) 연 수업은 기존 방식 그대로
    const nowClaude = atClosing({ settings: { ...LOW, leadMode: "claude" } });
    expect(
      lessonMoreChoiceOf({ start: startOf(), level: 1 }, nowClaude),
    ).toEqual({
      mode: "app",
      decision: lessonMoreOf(nowClaude),
    });
    expect(lessonMoreChoiceOf({ start: null, level: 1 }, nowClaude).mode).toBe(
      "app",
    );
  });

  it("AC-26a 정리 되짚을 말 출처도 처음 스냅숏 값으로 고른다", () => {
    const rows = [
      row({ recast: "I play soccer on Sunday." }),
      row({
        turnNo: 3,
        text: "Say it with me. I play soccer.",
        move: talkMoveOf({
          kind: "ai",
          lead: lead({
            move: "model_repeat",
            model: { sentence: "I play soccer.", inSay: true },
          }),
        }),
      }),
    ];
    expect(lessonWrapSourcesOf({ start: startOf(), level: 1, rows })).toEqual([
      "I play soccer on Sunday.",
    ]);
    expect(
      lessonWrapSourcesOf({
        start: startOf({ leadMode: "claude" }),
        level: 1,
        rows,
      }),
    ).toEqual(["I play soccer."]);
  });
});

describe("AC-26a 새 엔진은 처음 스냅숏이 claude 이고 1~3단계일 때만(isLeadSession, 검토 I-3)", () => {
  it("AC-26a 4단계 이상은 처음 스냅숏이 claude 여도 '더 이야기하기' · 정리 되짚을 말 · 대화로 넘김이 모두 기존 방식이다", () => {
    const start = startOf({ leadMode: "claude" });
    const core = atClosing();
    expect(lessonMoreChoiceOf({ start, level: 4 }, core)).toEqual({
      mode: "app",
      decision: lessonMoreOf(core),
    });
    expect(lessonMoreChoiceOf({ start, level: 3 }, core).mode).toBe("claude");
    const rows = [
      row({ recast: "I play soccer on Sunday." }),
      row({
        turnNo: 3,
        text: "Say it with me. I play soccer.",
        move: talkMoveOf({
          kind: "ai",
          lead: lead({
            move: "model_repeat",
            model: { sentence: "I play soccer.", inSay: true },
          }),
        }),
      }),
    ];
    expect(lessonWrapSourcesOf({ start, level: 4, rows })).toEqual([
      "I play soccer on Sunday.",
    ]);
    const prep = core3({ turns: greeted3(), segment: "prep" });
    expect(lessonAdvanceChoiceOf({ start, level: 7 }, prep, "talk")).toEqual({
      mode: "app",
      decision: lessonAdvanceOf(prep, "talk"),
    });
  });
});

describe("AC-26c 대화 토막의 첫 차례는 새 엔진이 쓴다(spec 설계 3 인사 토막 행 · 검토 I-2)", () => {
  const leadStart = { start: startOf({ leadMode: "claude" }), level: 1 };

  it("AC-26c 새 엔진 세션이 대화로 넘어가면 카드 첫 질문 계획 없이 토막만 정하고, 받는 토막은 기존 방식과 같다", () => {
    const cases = [
      core3({ turns: greeted3(), segment: "prep" }),
      core3({
        turns: greeted3(),
        segment: "greeting",
        prepPlan: [],
        prepWords: [],
      }),
    ];
    for (const core of cases) {
      const app = lessonAdvanceOf(core, "talk");
      if (!app.ok) throw new Error("기존 방식이 받는 차례여야 한다");
      expect(app.plan?.kind).toBe("first_question");
      expect(lessonAdvanceLeadOf(core)).toEqual({
        ok: true,
        segment: app.segment,
      });
      expect(lessonAdvanceChoiceOf(leadStart, core, "talk")).toEqual({
        mode: "claude",
        decision: { ok: true, segment: "talk" },
      });
    }
  });

  it("AC-26c 새 엔진도 기존 방식과 같은 조건에서는 넘기지 않는다(아이 차례 · 대화 중 · 닫힘 · 끊긴 아이 행 · 준비 계획이 남은 인사)", () => {
    const refused = [
      core3(),
      core3({ turns: [...opening3(), said()] }),
      core3({ turns: greeted3(), segment: "prep", orphan: true }),
      core3({ segment: "wrap_up" }),
      core3({ turns: greeted3(), segment: "greeting" }),
    ];
    for (const core of refused) {
      expect(lessonAdvanceOf(core, "talk")).toEqual({ ok: false });
      expect(lessonAdvanceLeadOf(core)).toEqual({ ok: false });
    }
  });

  it("AC-26c 새 엔진이 첫 차례를 쓰기 전(대화 토막에 선생님 행이 없음)에는 같은 넘김을 다시 받아 같은 신호를 내고, 화면 단계는 '대화로 넘김'에 머문다", () => {
    const waiting = core3({ turns: greeted3(), segment: "talk" });
    expect(lessonAdvanceLeadOf(waiting)).toEqual({ ok: true, segment: "talk" });
    expect(lessonStepOf(waiting)).toEqual({ kind: "advance", to: "talk" });
  });

  it("AC-26c 짧은 준비로 넘기기와 기존 방식 세션은 지금 판정 그대로다", () => {
    const greeting = core3({
      turns: greeted3(),
      segment: "greeting",
      prepWords: [],
    });
    expect(lessonAdvanceChoiceOf(leadStart, greeting, "prep")).toEqual({
      mode: "app",
      decision: lessonAdvanceOf(greeting, "prep"),
    });
    const prep = core3({ turns: greeted3(), segment: "prep" });
    for (const start of [startOf(), null])
      expect(lessonAdvanceChoiceOf({ start, level: 1 }, prep, "talk")).toEqual({
        mode: "app",
        decision: lessonAdvanceOf(prep, "talk"),
      });
  });
});

describe("AC-26c 정리 토막의 되짚을 말 출처(spec 설계 3 · plan 확인할 것 9)", () => {
  it("AC-26c 새 엔진은 recast 대신 이 수업에서 확인된 따라 할 문장(맞음)만 차례대로 쓰고, 어긋난 문장 · 아이 행 · move 없는 행은 뺀다", () => {
    const rows = [
      row({
        turnNo: 2,
        text: "Say it with me. I play soccer.",
        move: talkMoveOf({
          kind: "ai",
          lead: lead({
            move: "model_repeat",
            model: { sentence: "I play soccer.", inSay: true },
          }),
        }),
      }),
      // 아이 행에도 확인된 따라 할 문장이 든 move 를 두어 '아이 행은 뺀다'를 거르개가 실제로 지키게 한다(검토 M-1)
      row({
        turnNo: 2,
        speaker: "child",
        text: "I play soccer.",
        move: talkMoveOf({
          kind: "ai",
          lead: lead({
            move: "model_repeat",
            model: { sentence: "I go to school.", inSay: true },
          }),
        }),
      }),
      row({
        turnNo: 4,
        text: "Say: I like Sunday.",
        move: talkMoveOf({
          kind: "ai",
          lead: lead({
            move: "model_repeat",
            model: { sentence: "I like rainy Sunday.", inSay: false },
          }),
        }),
      }),
      row({ turnNo: 6, text: "Nice!", recast: "I like Sunday." }),
      row({
        turnNo: 8,
        text: "Say it with me. I play on the weekend.",
        move: talkMoveOf({
          kind: "ai",
          lead: lead({
            move: "model_repeat",
            model: { sentence: "I play on the weekend.", inSay: true },
          }),
        }),
      }),
    ];
    expect(
      lessonWrapSourcesOf({
        start: startOf({ leadMode: "claude" }),
        level: 1,
        rows,
      }),
    ).toEqual(["I play soccer.", "I play on the weekend."]);
    // 기존 방식은 지금 식 그대로(선생님 행의 recast)
    expect(lessonWrapSourcesOf({ start: startOf(), level: 1, rows })).toEqual([
      "I like Sunday.",
    ]);
  });
});

describe("AC-26c 이어하기 · 같은 시도 다시 흘림은 새 엔진 행을 저장한 그대로 다시 낸다", () => {
  const leadRow = row({
    turnNo: 5,
    text: "Wow, soccer! I like soccer too. Do you play on Sunday?",
    toriKo: "와, 축구! 나도 축구 좋아해. 일요일에 해?",
    move: talkMoveOf({
      kind: "ai",
      lead: lead({ asked: ["sunday"], said: ["soccer"] }),
    }),
  });

  it("AC-26c 이어하기의 대화 기록은 새 엔진 행의 say · say_ko 를 저장한 글 그대로 한 줄로 낸다", () => {
    const [log] = lessonLogOf([leadRow], { card: CARD3, koMeaning: true });
    expect(log).toEqual({
      speaker: "teacher",
      turnNo: 5,
      segment: "talk",
      kind: "ai",
      lines: [
        {
          en: "Wow, soccer! I like soccer too. Do you play on Sunday?",
          ko: "와, 축구! 나도 축구 좋아해. 일요일에 해?",
          app: false,
        },
      ],
    });
  });

  it("AC-26c 같은 시도 다시 흘림은 새 엔진 행의 문장 · 뜻 · 소리 줄을 저장한 그대로 낸다(신호 말은 부르는 쪽 몫)", () => {
    expect(
      lessonReplayLinesOf(leadRow, { card: CARD3, koMeaning: true }),
    ).toEqual([
      { t: "s", en: "Wow, soccer!" },
      { t: "s", en: "I like soccer too." },
      { t: "s", en: "Do you play on Sunday?" },
      { t: "ko", ko: "와, 축구! 나도 축구 좋아해. 일요일에 해?" },
    ]);
    // 1~3단계 따라 할 문장을 글에서 빼 소리 줄로 낸 행(설계 8 · 묶음 R5)
    const modelRow = row({
      turnNo: 7,
      text: "Say it with me.",
      toriKo: "같이 말해 보자.",
      move: talkMoveOf({
        kind: "ai",
        sound: { model: "I play soccer." },
        lead: lead({
          move: "model_repeat",
          model: { sentence: "I play soccer.", inSay: true },
          removed: ["I play soccer."],
        }),
      }),
    });
    expect(
      lessonReplayLinesOf(modelRow, { card: CARD3, koMeaning: true }),
    ).toEqual([
      { t: "s", en: "Say it with me." },
      { t: "ko", ko: "같이 말해 보자." },
      { t: "sound", kind: "model", say: "I play soccer." },
    ]);
  });
});

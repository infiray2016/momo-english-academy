// 회화 이야기 방식(intent 2026-11-13-회화-대화-구조-R plan 묶음 S2 fix 1)의 토막 판단 core 모듈(src/core/conversation/chat-segments.ts) 단위 시험.
// 서버(index.ts)와 대본 도구(T1)가 같은 함수를 부른다(NFR-4 · AC-18): 할 일(chatStepOf) · 대화로 넘김(lessonAdvanceChatOf) · 이어 하기 끝 줄
// 신호(chatResumeSignalOf) · 판정 맥락(chatJudgeContextOf). 시험 재료의 선생님 행은 묶음 S1 의 실제 꼴이다 — 대화 · 더 이야기하기 토막의 선생님 행은
// kind ai 이고 first_question 은 짧은 준비 뒤 돌아옴(back) 차례에만 생긴다(검토 rev-chat-s2 I-1).
import { describe, expect, it } from "vitest";
import { talkSceneWordsOf } from "@/core/ai/calls/talk-lesson";
import {
  type ChatSegmentCore,
  chatJudgeContextOf,
  chatResumeSignalOf,
  chatStepOf,
  lessonAdvanceChatOf,
} from "@/core/conversation/chat-segments";
import type { TalkLessonTurn } from "@/core/conversation/lesson-turns";
import { type TalkChat, talkMoveOf } from "@/core/conversation/move";
import {
  CARD3,
  LOW,
  NEW3,
  SPEC3,
  said,
  teacher,
} from "../fixtures/talk-lesson";

const PLAN3 = ["play", "soccer", "sunday"];

/** 이야기 방식 선생님 행(S1 의 꼴 — kind ai, 마무리 차례는 closing_slot, 돌아옴 차례만 first_question). */
const chatTeacher = (
  text: string,
  kind: "ai" | "closing_slot" | "first_question" = "ai",
) => teacher(text, { kind });

function greeting(): TalkLessonTurn[] {
  return [
    chatTeacher("Good evening! How was your day?"),
    said({ segment: "greeting" }),
    chatTeacher("Nice! Did you have fun?"),
    said({ segment: "greeting_end" }),
    chatTeacher("Cool! I love weekends."),
  ];
}

function core(over: Partial<ChatSegmentCore> = {}): ChatSegmentCore {
  return {
    spec: SPEC3,
    card: CARD3,
    newWords: NEW3,
    turns: [],
    segment: "greeting",
    settings: LOW,
    prepWords: [],
    prepPlan: [],
    orphan: false,
    ...over,
  };
}

/** 준비 없는 수업: 인사 → 대화(아이 · 물음 있는 선생님) → 마무리 물음 → 더 이야기하기 → 물음 없는 선생님 말. */
function noPrepMoreTalk(): TalkLessonTurn[] {
  return [
    ...greeting(),
    said({ segment: "talk" }),
    chatTeacher("Yum! What did you eat?"),
    said({ segment: "talk" }),
    chatTeacher("Great talk! Do you want to talk more?", "closing_slot"),
    chatTeacher("Okay! Let's talk more. What did you do today?"),
    said({ segment: "more_talk" }),
    chatTeacher("Let's talk more! I went to the sea."),
  ];
}

describe("AC-27e 할 일(chatStepOf) — 실제 S1 행 꼴(검토 rev-chat-s2 I-1)", () => {
  it("AC-27e 준비 없는 수업의 '더 이야기하기' 토막에서 물음 없는 선생님 말 뒤는 아이 차례다(넘길 수 없는 넘김이 아님)", () => {
    const c = core({ segment: "more_talk", turns: noPrepMoreTalk() });
    expect(chatStepOf(c)).toEqual({ kind: "child" });
    expect(lessonAdvanceChatOf(c)).toEqual({ ok: false });
  });

  it("AC-27e 준비 없는 수업의 대화 토막에서 물음 없는 선생님 말 뒤도 아이 차례다", () => {
    const c = core({
      segment: "talk",
      turns: [
        ...greeting(),
        said({ segment: "talk" }),
        chatTeacher("I like rice."),
      ],
    });
    expect(chatStepOf(c)).toEqual({ kind: "child" });
  });

  it("AC-27e 수업 첫 말 차례(인사 토막 · 선생님 행 없음)는 넘김이고 신호 start", () => {
    expect(chatStepOf(core())).toEqual({ kind: "advance", to: "talk" });
    expect(lessonAdvanceChatOf(core())).toEqual({
      ok: true,
      segment: "greeting",
      lead: "start",
    });
  });

  it("AC-27e 준비가 열린 수업은 돌아옴 차례 전까지 대화 토막의 할 일이 넘김(back)이고, 돌아옴 행(first_question) 뒤에는 기존 판정으로 간다", () => {
    const opened = core({
      segment: "talk",
      turns: greeting(),
      prepPlan: PLAN3,
      prepWords: PLAN3,
    });
    expect(chatStepOf(opened)).toEqual({ kind: "advance", to: "talk" });
    expect(lessonAdvanceChatOf(opened)).toEqual({
      ok: true,
      segment: "talk",
      lead: "back",
    });
    const back = core({
      ...opened,
      turns: [
        ...greeting(),
        chatTeacher("Welcome back! What did you eat?", "first_question"),
      ],
    });
    expect(chatStepOf(back)).toBeNull();
    expect(lessonAdvanceChatOf(back)).toEqual({ ok: false });
  });

  it("AC-27e 준비 없는 수업의 인사 끝은 신호 없이 대화 토막으로 · 준비를 열고 보인 낱말이 없으면 신호 없이", () => {
    expect(lessonAdvanceChatOf(core({ turns: greeting() }))).toEqual({
      ok: true,
      segment: "talk",
      lead: null,
    });
    expect(
      lessonAdvanceChatOf(
        core({ turns: greeting(), segment: "prep", prepPlan: PLAN3 }),
      ),
    ).toEqual({ ok: true, segment: "talk", lead: null });
    expect(
      lessonAdvanceChatOf(
        core({
          turns: greeting(),
          segment: "prep",
          prepPlan: PLAN3,
          prepWords: PLAN3,
        }),
      ),
    ).toEqual({ ok: true, segment: "talk", lead: "back" });
  });

  it("AC-27e 끊긴 아이 행 · 정리 토막에서는 갈래가 없다(기존 판정)", () => {
    expect(chatStepOf(core({ segment: "wrap_up" }))).toBeNull();
    expect(lessonAdvanceChatOf(core({ orphan: true }))).toEqual({ ok: false });
  });
});

// ── 이어 하기 끝 줄 신호 ─────────────────────────────────────────────

type Row = Parameters<typeof chatResumeSignalOf>[0]["liveRows"][number];

const rowOf = (over: Partial<Row>): Row =>
  ({
    id: "00000000-0000-4000-8000-000000000001",
    turnNo: 1,
    segment: "talk",
    speaker: "tori",
    text: null,
    inputMode: null,
    hintLevel: null,
    clientListen: null,
    sentUserMessage: null,
    toriRewrite: null,
    aiQuestion: null,
    move: null,
    chatJudge: null,
    stuckPhrase: null,
    ...over,
  }) as Row;

const chatMove = (chat: Partial<TalkChat> = {}) =>
  talkMoveOf({
    kind: "ai",
    chat: { level: {}, madeUp: [], facts: [], run: 0, ...chat },
  });

describe("AC-27f 이어 하기 끝 줄 신호(chatResumeSignalOf — S1 chatSignalOfRows 와 같은 판단)", () => {
  it("AC-27f 첫 말 실패 · 'AI 쉬는 중'의 카드 인사 첫 줄 행(S1 꼴: kind ai · move.chat · 기록 글 없음) 뒤의 신호", () => {
    const opening = rowOf({
      speaker: "tori",
      segment: "greeting",
      text: "How are you today?",
      toriRewrite: null,
      sentUserMessage:
        "(The chat starts now. It is Sunday evening.) Say hello.",
      move: chatMove(),
    });
    expect(
      chatResumeSignalOf({ liveRows: [opening], settings: LOW }, false),
    ).toEqual({
      quietSeconds: LOW.chat.quietSeconds,
      hint: true,
      alternatives: LOW.chat.alternatives,
    });
    // 쉬는 중이면 조용함 기다림이 없다(힌트 단추는 있음 — 저장된 단은 쉬는 중에도 낸다)
    expect(
      chatResumeSignalOf({ liveRows: [opening], settings: LOW }, true),
    ).toEqual({ hint: true, alternatives: LOW.chat.alternatives });
  });

  it("AC-27f 마무리 물음 행 · 짧은 준비 앞 행은 빈 신호", () => {
    const closing = rowOf({
      move: talkMoveOf({
        kind: "closing_slot",
        chat: { level: {}, madeUp: [], facts: [], run: 0 },
      }),
    });
    expect(
      chatResumeSignalOf({ liveRows: [closing], settings: LOW }, false),
    ).toEqual({});
    const prepNext = rowOf({ move: chatMove({ facts: ["prep_next"] }) });
    expect(
      chatResumeSignalOf({ liveRows: [prepNext], settings: LOW }, false),
    ).toEqual({});
  });
});

// ── 판정 맥락(검토 rev-chat-s2 I-2) ───────────────────────────────────

describe("AC-27i 판정 맥락은 넘긴 단원 단어(단계 맥락의 값 — 턴 길과 같은 출처)로 만든다", () => {
  /** 장면 낱말이 읽는 카드 칸만(목표 표현 · 오늘 쓸 말 · 필수 · 더 이야기할 거리). */
  const sceneCard = {
    targetExpressions: ["I see the sky."],
    todayWords: [],
    required: [],
    more: [],
  } as unknown as Parameters<typeof chatJudgeContextOf>[0]["card"];
  const lesson = {
    lemmaOf: (w: string) => (w === "seas" ? "sea" : undefined),
    card: sceneCard,
    spec: { band: "1-3" as const },
    teacher: { nameEn: "Mina" },
  };

  it("AC-27i 단원 단어 · 장면 낱말은 인자의 단원 단어에서 오고, 선생님 이름은 시드 nameEn 이다(아이 이름 없음)", () => {
    const unitWords = ["see", "sky", "sea", "eat"];
    const ctx = chatJudgeContextOf(lesson, {
      unitWords,
      homophones: [["sea", "see"]],
    });
    expect(ctx.unitWords).toEqual(unitWords);
    expect([...ctx.sceneWords].sort()).toEqual(
      [...talkSceneWordsOf({ card: sceneCard, unitWords })].sort(),
    );
    expect(ctx.homophones).toEqual([["sea", "see"]]);
    expect(ctx.spec).toEqual({ band: "1-3" });
    expect(ctx.teacherName).toBe("Mina");
    expect(ctx.lemmaOf("seas")).toBe("sea");
    expect(
      chatJudgeContextOf(
        { ...lesson, teacher: null },
        { unitWords, homophones: [] },
      ).teacherName,
    ).toBeNull();
  });
});

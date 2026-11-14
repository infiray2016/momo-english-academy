// 회화 이야기 방식(talk.lead_mode 'chat', intent 2026-11-13-회화-대화-구조-R plan 묶음 S2 — 토막 접점 · 닫기)의 격리 단위 시험.
// (1) 토막 접점의 순수 판단: 이야기 방식 수업만 새 갈래를 지나고(수업 열기 · 토막 넘김 · '더 이야기하기' · 정리 되짚을 말 · 대화 기록 · 다시 보내기 ·
//     다시 들어올 때의 끝 줄 신호), 기존 두 방식(app · claude)은 고치기 전과 같은 판단이다. DB 를 거치는 길은 tests/integration/talk-chat-segments ·
//     talk-chat-closing · talk-chat-hint-action(CI 몫).
// (2) 호출 자리 검색(AC-8 · AC-17 → 15절 AC-27h · AC-27q): 판정 기록(chat_judge)과 판정 · 비교 · 평가 모듈이 공식 '말했다' · '말함' 기록 쓰기 · '안다' ·
//     단원 통과 · 승급 · 흐름의 입력에 닿지 않음, 녹음 API 를 쓰지 않음, 이야기 방식 호출 입력을 만드는 파일이 아이 이름 칸을 읽지 않음을 소스 글로 지킨다.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { TALK_LEAD_TEXT_L3U1 } from "@/core/ai/calls/talk-lead";
import { talkLessonPositionOf } from "@/core/conversation/lesson-flow";
import { type TalkChat, talkMoveOf } from "@/core/conversation/move";
import {
  chatResumeSignalOf,
  chatUnitMaterialOf,
  type LessonCore,
  lessonAdvanceChatOf,
  lessonAdvanceChoiceOf,
  lessonCurrentHintsOf,
  lessonLogOf,
  lessonMoreChoiceOf,
  lessonMoreLeadOf,
  lessonRetryLeadOf,
  lessonRetryTurnOf,
  lessonStartModeOf,
  lessonStepOf,
  lessonWrapSourcesOf,
} from "@/server/conversation";
import {
  lessonTurnOf,
  type TalkLessonState,
  type TalkTurnRow,
} from "@/server/conversation/state";
import { rosterOf } from "@/server/teacher";
import {
  CARD3,
  LOW,
  NEW3,
  SPEC3,
  said,
  teacher,
} from "../fixtures/talk-lesson";

const PLAN3 = ["play", "soccer", "sunday"];
const ROOT = process.cwd();

// ── 재료 ──────────────────────────────────────────────────────────

/** 이야기 방식 인사: 선생님 첫 말 → 아이 → 선생님 → 아이(인사 끝) → 선생님(인사 끝 차례). 카드 인사 행은 없다. */
function chatGreeting() {
  return [
    teacher("Hi! It is Sunday evening. How was your day?", { kind: "ai" }),
    said({ segment: "greeting" }),
    teacher("Nice! I love Sundays.", { kind: "ai" }),
    said({ segment: "greeting_end" }),
    teacher("Cool! Tell me more.", { kind: "ai" }),
  ];
}

function core(over: Partial<LessonCore> = {}): LessonCore {
  return {
    spec: SPEC3,
    card: CARD3,
    newWords: NEW3,
    turns: [],
    segment: "greeting",
    settings: LOW,
    prepWords: [],
    prepPlan: [],
    status: "in_progress",
    orphan: false,
    todayWordCount: NEW3.length,
    ...over,
  };
}

const chatCore = (over: Partial<LessonCore> = {}) =>
  core({ chat: true, ...over });

const rowOf = (over: Partial<TalkTurnRow>): TalkTurnRow =>
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
    chatJudge: null,
    recordedAt: new Date("2026-11-13T10:00:00+09:00"),
    ...over,
  }) as TalkTurnRow;

const chatMove = (chat: Partial<TalkChat> = {}) =>
  talkMoveOf({
    kind: "ai",
    chat: { level: {}, madeUp: [], facts: [], run: 0, ...chat },
  });

type Start = NonNullable<TalkLessonState["start"]>;
const startOf = (leadMode: Start["leadMode"]): Start => ({
  metBefore: [],
  prepPlan: [],
  carry: { goals: [], words: [] },
  ...(leadMode === undefined ? {} : { leadMode }),
});
const CHAT_START = startOf("chat");
const CLAUDE_START = startOf("claude");
const MATERIAL = { chatPersonaEn: "I am Mina.", chatFavoritesEn: "the sea" };
const NO_MATERIAL = { chatPersonaEn: undefined, chatFavoritesEn: undefined };

// ── (1) 수업 열기 ──────────────────────────────────────────────────

describe("AC-27a 수업을 열 때의 방식(조건 넷 — 묶음 S2)", () => {
  it("AC-27a 설정 chat · 1~3단계 · 단원 재료 · 선생님 재료가 모두 서면 chat, 하나라도 빠지면 기존 방식(app)", () => {
    const base = {
      mode: "chat" as const,
      level: 3,
      unit: 1,
      teacher: MATERIAL,
    };
    expect(lessonStartModeOf(base)).toBe("chat");
    // 선생님 재료 없음(리오) · 선생님 없음 · 다른 단원 · 4단계
    expect(lessonStartModeOf({ ...base, teacher: NO_MATERIAL })).toBe("app");
    expect(lessonStartModeOf({ ...base, teacher: null })).toBe("app");
    expect(lessonStartModeOf({ ...base, unit: 2 })).toBe("app");
    expect(lessonStartModeOf({ ...base, level: 4 })).toBe("app");
  });

  it("AC-27a 설정 app · claude 는 지금 판단 그대로다(선생님 재료와 무관)", () => {
    for (const teacher of [MATERIAL, NO_MATERIAL, null]) {
      expect(
        lessonStartModeOf({ mode: "app", level: 3, unit: 1, teacher }),
      ).toBe("app");
      expect(
        lessonStartModeOf({ mode: "claude", level: 3, unit: 1, teacher }),
      ).toBe("claude");
      expect(
        lessonStartModeOf({ mode: "claude", level: 3, unit: 2, teacher }),
      ).toBe("app");
      expect(
        lessonStartModeOf({ mode: "claude", level: 4, unit: 1, teacher }),
      ).toBe("app");
    }
  });

  it("AC-27a 시드의 미나는 이야기 방식 재료가 있어 chat, 리오는 없어 기존 방식으로 열린다", () => {
    const roster = rosterOf();
    const mina = roster.find((t) => t.key === "mina") ?? null;
    const rio = roster.find((t) => t.key === "leo") ?? null;
    expect(mina).not.toBeNull();
    expect(rio).not.toBeNull();
    expect(
      lessonStartModeOf({ mode: "chat", level: 3, unit: 1, teacher: mina }),
    ).toBe("chat");
    expect(
      lessonStartModeOf({ mode: "chat", level: 3, unit: 1, teacher: rio }),
    ).toBe("app");
  });

  it("AC-27a 단원 재료는 단원 표의 이야기 방식 주제 칸이고, 표 출처를 바꾸면(시험의 1단계 시드) 그 표로 판단한다", () => {
    const l3u1 = () => TALK_LEAD_TEXT_L3U1;
    expect(chatUnitMaterialOf(l3u1, 1, 1)).toBe(true);
    expect(chatUnitMaterialOf(() => null, 3, 1)).toBe(false);
    expect(
      chatUnitMaterialOf(
        () => ({ ...TALK_LEAD_TEXT_L3U1, chatTopicEn: "  " }),
        3,
        1,
      ),
    ).toBe(false);
    expect(
      lessonStartModeOf({
        mode: "chat",
        level: 1,
        unit: 1,
        teacher: MATERIAL,
        leadText: l3u1,
      }),
    ).toBe("chat");
  });
});

// ── (1) 토막 넘김 ──────────────────────────────────────────────────

describe("AC-27e 이야기 방식의 토막 넘김(spec 설계 5 · 보완 4 (5))", () => {
  it("AC-27e 수업 첫 말 차례(선생님 행 없음)는 토막 넘김이고, 넘김은 카드 행 없이 신호 start 를 낸다", () => {
    const c = chatCore();
    expect(lessonStepOf(c)).toEqual({ kind: "advance", to: "talk" });
    expect(lessonAdvanceChatOf(c)).toEqual({
      ok: true,
      segment: "greeting",
      lead: "start",
    });
    expect(
      lessonAdvanceChoiceOf({ start: CHAT_START, level: 3 }, c, "talk"),
    ).toMatchObject({ mode: "chat" });
  });

  it("AC-27e 준비가 없는 합성 카드는 인사 → 대화 사이에 입구 호출 없음", () => {
    const greeted = chatCore({ turns: chatGreeting() });
    expect(lessonStepOf(greeted)).toEqual({ kind: "advance", to: "talk" });
    expect(lessonAdvanceChatOf(greeted)).toEqual({
      ok: true,
      segment: "talk",
      lead: null,
    });
    // 넘긴 뒤(대화 토막, 대화 토막 선생님 행 없음)는 아이 차례 — 다시 넘기지 않는다
    expect(lessonStepOf({ ...greeted, segment: "talk" })).toEqual({
      kind: "child",
    });
    expect(lessonAdvanceChatOf({ ...greeted, segment: "talk" })).toEqual({
      ok: false,
    });
  });

  it("AC-27e 짧은 준비가 열린 수업은 준비가 닫힌 뒤 첫 대화 차례를 돌아옴 신호 back 으로 열고, 다시 열어도 같은 신호다", () => {
    const greeted = chatCore({
      turns: chatGreeting(),
      prepPlan: PLAN3,
      prepWords: PLAN3,
    });
    // 인사 끝 → 짧은 준비는 세 방식 모두 지금 길(lessonAdvanceOf prep)
    expect(lessonStepOf(greeted)).toEqual({ kind: "advance", to: "prep" });
    expect(
      lessonAdvanceChoiceOf({ start: CHAT_START, level: 3 }, greeted, "prep")
        .mode,
    ).toBe("app");
    expect(lessonAdvanceChatOf(greeted)).toEqual({ ok: false });
    expect(lessonAdvanceChatOf({ ...greeted, segment: "prep" })).toEqual({
      ok: true,
      segment: "talk",
      lead: "back",
    });
    // 신호를 받고 돌아옴 차례가 쓰이기 전에 다시 열면 같은 넘김
    const reopened = { ...greeted, segment: "talk" as const };
    expect(lessonStepOf(reopened)).toEqual({ kind: "advance", to: "talk" });
    expect(lessonAdvanceChatOf(reopened)).toEqual({
      ok: true,
      segment: "talk",
      lead: "back",
    });
    // 돌아옴 차례(대화 토막 첫 선생님 행 first_question)가 쓰인 뒤에는 아이 차례
    const back = {
      ...reopened,
      turns: [
        ...chatGreeting(),
        teacher("Welcome back! What did you eat?", { kind: "first_question" }),
      ],
    };
    expect(lessonStepOf(back)).toEqual({ kind: "child" });
    expect(lessonAdvanceChatOf(back)).toEqual({ ok: false });
  });

  it("AC-27e 준비를 열었으나 쪽지로 보인 낱말이 없으면 돌아옴 없이 아이 차례다(턴 길의 back 받기 조건 prepOpened 와 같음)", () => {
    const unseen = chatCore({
      turns: chatGreeting(),
      prepPlan: PLAN3,
      prepWords: [],
      segment: "prep",
    });
    expect(lessonAdvanceChatOf(unseen)).toEqual({
      ok: true,
      segment: "talk",
      lead: null,
    });
    expect(lessonStepOf({ ...unseen, segment: "talk" })).toEqual({
      kind: "child",
    });
  });

  it("AC-27e 기존 두 방식(칸 없음)은 이야기 방식 갈래를 지나지 않는다", () => {
    const plain = core();
    expect(lessonStepOf(plain)).toEqual({ kind: "child" });
    expect(
      lessonAdvanceChoiceOf({ start: CLAUDE_START, level: 3 }, plain, "talk")
        .mode,
    ).toBe("claude");
    expect(
      lessonAdvanceChoiceOf({ start: null, level: 3 }, plain, "talk").mode,
    ).toBe("app");
    // 스냅숏이 chat 이어도 4단계면 이야기 방식이 아니다(isChatSession)
    expect(
      lessonAdvanceChoiceOf({ start: CHAT_START, level: 4 }, plain, "talk")
        .mode,
    ).toBe("app");
  });

  it("AC-27e 준비 없는 수업의 '더 이야기하기' 토막에서 물음 없는 선생님 말 뒤의 할 일은 아이 차례다(S1 행 꼴 — 대화 토막 선생님 행 kind ai, 검토 I-1)", () => {
    const turns = [
      ...chatGreeting(),
      said({ segment: "talk" }),
      teacher("Yum! What did you eat?", { kind: "ai" }),
      said({ segment: "talk" }),
      teacher("Great talk! Do you want to talk more?", {
        kind: "closing_slot",
      }),
      teacher("Okay! Let's talk more. What did you do today?", { kind: "ai" }),
      said({ segment: "more_talk" }),
      teacher("Let's talk more! I went to the sea.", { kind: "ai" }),
    ];
    const more = chatCore({ segment: "more_talk", turns });
    expect(lessonStepOf(more)).toEqual({ kind: "child" });
    expect(lessonStepOf({ ...more, segment: "talk" })).toEqual({
      kind: "child",
    });
  });

  it("AC-27k '더 이야기하기'는 카드 거리 행 없이 신호만(새 엔진과 같은 결정)", () => {
    const closing = chatCore({
      segment: "talk",
      turns: [
        ...chatGreeting(),
        teacher("What did you eat?", { kind: "ai" }),
        said(),
        teacher("Great talk! Do you want to talk more?", {
          kind: "closing_slot",
        }),
      ],
    });
    const choice = lessonMoreChoiceOf({ start: CHAT_START, level: 3 }, closing);
    expect(choice.mode).toBe("chat");
    expect(choice.decision).toEqual(lessonMoreLeadOf(closing));
    expect(choice.decision).toMatchObject({
      ok: true,
      segment: "more_talk",
      complete: true,
    });
    expect(
      lessonMoreChoiceOf({ start: CLAUDE_START, level: 3 }, closing).mode,
    ).toBe("claude");
    expect(lessonMoreChoiceOf({ start: null, level: 3 }, closing).mode).toBe(
      "app",
    );
  });
});

// ── (1) 정리 되짚을 말 · 대화 기록 · 다시 보내기 · 다시 들어올 때 ─────────────

describe("AC-27e 정리 되짚을 말 · 대화 기록 · 다시 보낼 자료(묶음 S2)", () => {
  const rows = [
    rowOf({
      speaker: "tori",
      turnNo: 1,
      recast: "I eat bread.",
      move: chatMove({ listen: { sentence: "I eat apples.", inSay: true } }),
    }),
    rowOf({
      speaker: "tori",
      turnNo: 3,
      move: chatMove({ listen: { sentence: "I go home.", inSay: false } }),
    }),
  ];

  it("AC-27e 이야기 방식의 되짚을 말은 say 에 든 것으로 확인된 따라 할 문장이고, 기존 두 방식은 지금 출처 그대로다", () => {
    expect(lessonWrapSourcesOf({ start: CHAT_START, level: 3, rows })).toEqual([
      "I eat apples.",
    ]);
    expect(lessonWrapSourcesOf({ start: null, level: 3, rows })).toEqual([
      "I eat bread.",
    ]);
    // 4단계는 이야기 방식이 아니다
    expect(lessonWrapSourcesOf({ start: CHAT_START, level: 4, rows })).toEqual([
      "I eat bread.",
    ]);
  });

  it("AC-27f 대화 기록은 조용함 행에서 던지지 않고 그 행을 빼며(선생님 말풍선이 잇달아 쌓임), 다른 행은 그대로다", () => {
    const log = [
      rowOf({ speaker: "tori", turnNo: 1, text: "Hi! How was your day?" }),
      rowOf({ speaker: "child", turnNo: 2, inputMode: "quiet" }),
      rowOf({ speaker: "tori", turnNo: 3, text: "I went to the park." }),
      rowOf({
        speaker: "child",
        turnNo: 4,
        inputMode: "speech",
        text: "Me too.",
      }),
    ];
    const ctx = { card: CARD3, koMeaning: false };
    const out = lessonLogOf(log, ctx);
    expect(out.map((r) => [r.speaker, r.turnNo])).toEqual([
      ["teacher", 1],
      ["teacher", 3],
      ["child", 4],
    ]);
    // 조용함 행이 없는 기록(기존 두 방식)은 거르기 전과 같다
    const plain = log.filter((r) => r.inputMode !== "quiet");
    expect(lessonLogOf(plain, ctx)).toEqual(out);
  });

  it("AC-27f 선생님 말이 없는 마지막 아이 행이 조용함 행이면 아이 말로 다시 보내지 않고 조용함 입구로 낸다", () => {
    const quiet = rowOf({
      speaker: "child",
      inputMode: "quiet",
      clientAttemptId: "quiet-1",
    });
    expect(lessonRetryTurnOf(quiet)).toBeNull();
    expect(lessonRetryLeadOf(quiet)).toBe("quiet");
    const spoken = rowOf({
      speaker: "child",
      inputMode: "speech",
      text: "Me too.",
      clientAttemptId: "turn-1",
    });
    expect(lessonRetryTurnOf(spoken)).toEqual({
      clientAttemptId: "turn-1",
      mode: "speech",
      text: "Me too.",
    });
    expect(lessonRetryLeadOf(spoken)).toBeNull();
    expect(lessonRetryLeadOf(null)).toBeNull();
  });

  it("AC-27f 이어 하기 자료의 힌트 단은 이야기 방식에서 카드 인사 질문과 같은 말이어도 카드 힌트가 끼어들지 않는다(기존 방식은 카드 힌트 그대로)", () => {
    const turns = [teacher("How are you today?", { kind: "ai" })];
    const spec = {
      ...SPEC3,
      hintTiers: ["ko", "sentence"],
      usablePhrases: 0,
    };
    const base = {
      spec,
      card: CARD3,
      turns,
      liveRows: [],
      level: 3,
      position: talkLessonPositionOf({
        spec: SPEC3,
        card: CARD3,
        newWords: NEW3,
        turns,
        segment: "greeting",
        settings: LOW,
        prepWords: [],
      }),
    };
    const app = { ...base, start: null } as unknown as Parameters<
      typeof lessonCurrentHintsOf
    >[0];
    const chat = { ...base, start: CHAT_START } as unknown as Parameters<
      typeof lessonCurrentHintsOf
    >[0];
    expect(lessonCurrentHintsOf(app).length).toBeGreaterThan(0);
    expect(lessonCurrentHintsOf(chat)).toEqual([]);
  });

  it("AC-27f 다시 들어왔을 때의 끝 줄 신호는 턴 길의 끝 줄과 같은 판단이다(보통 · 막힘 뒤 · 잇달아 말한 수 상한 · 고를 차례 · 쉬는 중 · 준비 앞)", () => {
    const chat = LOW.chat;
    const state = (liveRows: TalkTurnRow[]) =>
      ({ liveRows, settings: LOW }) as unknown as Parameters<
        typeof chatResumeSignalOf
      >[0];
    const t = (turnNo: number, chat: Partial<TalkChat> = {}, closing = false) =>
      rowOf({
        speaker: "tori",
        turnNo,
        move: closing
          ? talkMoveOf({
              kind: "closing_slot",
              chat: { level: {}, madeUp: [], facts: [], run: 0, ...chat },
            })
          : chatMove(chat),
      });
    const c = (turnNo: number, over: Partial<TalkTurnRow> = {}) =>
      rowOf({
        speaker: "child",
        turnNo,
        inputMode: "speech",
        text: "I like it.",
        ...over,
      });
    // 보통 차례: 기다림 · 힌트 · 후보 수, 설명 기다림 없음
    expect(chatResumeSignalOf(state([t(1), c(2), t(3)]), false)).toEqual({
      quietSeconds: chat.quietSeconds,
      hint: true,
      alternatives: chat.alternatives,
    });
    // '잘 모르겠어요' 뒤: 설명 기다림이 실린다
    expect(
      chatResumeSignalOf(
        state([t(1), c(2, { inputMode: "dont_know", text: null }), t(3)]),
        false,
      ),
    ).toMatchObject({ explainWait: chat.explainWaitSeconds, hint: true });
    // 조용함이 잇달아 상한: 기다림 없음(거르지 않은 행으로 셈)
    const quietRun = [t(1)];
    for (let i = 0; i < chat.teacherRunMax; i += 1)
      quietRun.push(
        c(2 + i * 2, { inputMode: "quiet", text: null }),
        t(3 + i * 2),
      );
    expect(chatResumeSignalOf(state(quietRun), false).quietSeconds).toBe(
      undefined,
    );
    // 마무리 차례: 두 단추라 기다림 · 힌트 · 후보 수 없음
    expect(
      chatResumeSignalOf(state([t(1), c(2), t(3, {}, true)]), false),
    ).toEqual({});
    // 'AI 쉬는 중': 기다림 없음, 힌트 단추는 있음(저장된 단은 쉬는 중에도 낸다)
    expect(chatResumeSignalOf(state([t(1), c(2), t(3)]), true)).toEqual({
      hint: true,
      alternatives: chat.alternatives,
    });
    // 인사 끝이고 짧은 준비가 열릴 차례: 빈 신호
    expect(
      chatResumeSignalOf(
        state([t(1), c(2), t(3, { facts: ["prep_next"] })]),
        false,
      ),
    ).toEqual({});
  });
});

// ── (2) 호출 자리 검색 ────────────────────────────────────────────────

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path));
    else if (/\.(ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}

const SRC = filesUnder(join(ROOT, "src")).map((path) => ({
  file: relative(ROOT, path).split("\\").join("/"),
  text: readFileSync(path, "utf8"),
}));

/** 주석을 뺀 글(줄 주석 · 덩이 주석 — 소스 검색이 설명 글에 걸리지 않게). */
function codeOf(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** 판정 · 비교 · 평가 모듈을 가져오거나 판정 기록 열(chatJudge)을 읽고 쓰는가. */
const JUDGE_USE =
  /from\s+"(@\/core\/conversation\/chat-(judge|compare)|@\/core\/ai\/calls\/talk-chat-eval|@\/server\/conversation\/chat-eval|\.\/chat-eval)"|\bchatJudge\b/;

/**
 * 판정 기록과 그 모듈에 닿아도 되는 src 파일: 판정 · 비교 · 평가 모듈 자신, 표 정의, 평가 · 힌트 저장(S0), 턴 길의 첫 판정 기록 쓰기(S1), 닫는 길의
 * 평가 · 비교 표지 행(S2). 새 파일이 여기에 닿으면 이 목록과 그 자리를 함께 검토한다.
 */
const JUDGE_ALLOWED = new Set([
  "src/core/conversation/chat-judge.ts",
  "src/core/conversation/chat-compare.ts",
  // 판정 맥락(ChatJudgeContext 형)을 만드는 토막 판단 core 모듈(묶음 S2 fix 1)
  "src/core/conversation/chat-segments.ts",
  "src/core/ai/calls/talk-chat-eval.ts",
  "src/db/schema/learning.ts",
  "src/server/conversation/chat-eval.ts",
  "src/server/conversation/chat-hint.ts",
  "src/server/conversation/chat-turn.ts",
  // 판정 맥락을 단원 낱말 재료로 만드는 서버 도우미(묶음 S2 fix 2)
  "src/server/conversation/chat-unit-words.ts",
  // 그 순수 몫(판정 맥락 · 단원 낱말 재료)을 옮긴 core 모듈(묶음 S2 fix 3)
  "src/core/conversation/chat-unit-words.ts",
  "src/server/conversation/closing.ts",
]);

/** 공식 학습 근거 · 흐름의 자리: '말했다' · '말함' 기록 쓰기 · '안다' · 단원 통과 · 승급 · 흐름(위치 되짚기 · 참여 완료 · 기회). */
const OFFICIAL = [
  "src/core/conversation/said.ts",
  "src/core/conversation/lesson-flow.ts",
  "src/core/conversation/ending.ts",
  "src/core/conversation/chances.ts",
  "src/server/conversation/state.ts",
  "src/core/vocab/",
  "src/core/scoring/",
  "src/core/session/",
  "src/core/lesson-list/",
  "src/core/evidence/",
  "src/core/placement/",
  "src/server/session/",
  "src/server/lesson-list/",
  "src/server/home/",
  "src/server/placement/",
];

describe("AC-27h 판정 기록은 공식 학습 근거 · 흐름의 입력이 아니다(호출 자리 검색)", () => {
  const users = SRC.filter((f) => JUDGE_USE.test(codeOf(f.text))).map(
    (f) => f.file,
  );

  it("AC-27h 판정 기록(chat_judge)과 판정 · 비교 · 평가 모듈에 닿는 src 파일은 정해진 저장 · 기록 자리뿐이다", () => {
    expect(users.filter((file) => !JUDGE_ALLOWED.has(file))).toEqual([]);
    // 검색이 헛돌지 않음(모듈 자신은 걸린다)
    expect(users).toContain("src/core/conversation/chat-judge.ts");
  });

  it("AC-27h '말했다' · '말함' 기록 쓰기 · '안다' · 단원 통과 · 승급 · 흐름의 자리는 판정 기록을 가져오지도 읽지도 않는다", () => {
    const touched = SRC.filter(
      (f) =>
        OFFICIAL.some((p) => f.file === p || f.file.startsWith(p)) &&
        JUDGE_USE.test(codeOf(f.text)),
    ).map((f) => f.file);
    expect(touched).toEqual([]);
  });

  it("AC-27h 판정 기록에 닿는 파일의 '말함' 기록 쓰기와 '말했다' 칸은 늘 빈 목록이다(이야기 방식은 공식 '말했다'를 비움)", () => {
    for (const f of SRC.filter(
      (x) => users.includes(x.file) && x.file.startsWith("src/server/"),
    )) {
      const code = codeOf(f.text);
      for (const m of code.matchAll(/writeSay\(/g)) {
        const call = code.slice(m.index, (m.index ?? 0) + 400);
        expect(call, `${f.file} writeSay`).toMatch(/said:\s*\[\]/);
      }
      // 줄인 꼴({ saidWords }) · 다른 값도 잡게 낱말 경계로 찾는다(검토 M-2)
      for (const m of code.matchAll(/\bsaidWords\b(\s*:\s*([^,\n}]+))?/g))
        expect(m[2]?.trim(), `${f.file} saidWords`).toBe("[]");
    }
  });
});

describe("AC-27h 공식 자리는 판정 기록 자리에서 값을 가져오지 않는다(검토 M-2)", () => {
  /** 판정 기록 자리 가운데 표 정의(learning.ts — 표 객체만 가져감) 밖의 모듈. */
  const JUDGE_MODULES = [...JUDGE_ALLOWED]
    .filter((file) => file !== "src/db/schema/learning.ts")
    .map((file) => file.replace(/^src\//, "").replace(/\.ts$/, ""));

  it("AC-27h 공식 학습 근거 · 흐름의 파일은 판정 · 비교 · 평가 · 닫을 때 평가 · 턴 길 파일에서 아무것도 가져오지 않는다", () => {
    const imports = SRC.filter((f) =>
      OFFICIAL.some((p) => f.file === p || f.file.startsWith(p)),
    ).flatMap((f) =>
      [...codeOf(f.text).matchAll(/from\s+"([^"]+)"/g)]
        .map((m) => m[1] ?? "")
        .filter((spec) =>
          JUDGE_MODULES.some(
            (mod) =>
              spec === `@/${mod}` || spec.endsWith(`/${mod.split("/").at(-1)}`),
          ),
        )
        .map((spec) => `${f.file} ← ${spec}`),
    );
    expect(imports).toEqual([]);
  });

  it("AC-27h 수업 상태의 아이 차례 꼴(lessonTurnOf)에는 판정 기록 칸이 없다 — 흐름 · 참여 판정이 그 값을 받을 수 없다", () => {
    const turn = lessonTurnOf(
      rowOf({
        speaker: "child",
        inputMode: "speech",
        text: "I see the sea.",
        chatJudge: { legacy: { status: "done" } },
      }),
    );
    expect(Object.keys(turn)).not.toContain("chatJudge");
    expect(JSON.stringify(turn)).not.toContain("legacy");
  });
});

describe("AC-27q 녹음하지 않음 · 아이 이름을 호출 입력에 넣지 않음(호출 자리 검색)", () => {
  /** 이 변경 단위가 더한 이야기 방식 파일(이름으로 고름 — 대화 · 힌트 · 평가 호출 · 판정 · 조용함 · 저장). */
  const chatFiles = SRC.filter((f) =>
    /\/(chat-[\w-]+|talk-chat[\w-]*|quiet-listen-stats)\.ts$/.test(f.file),
  );

  it("AC-27q 이 변경 단위의 이야기 방식 src 파일에는 getUserMedia · MediaRecorder 가 없다(주석 포함)", () => {
    expect(chatFiles.length).toBeGreaterThan(5);
    for (const f of chatFiles)
      expect(f.text, f.file).not.toMatch(/getUserMedia|MediaRecorder/);
  });

  it("AC-27q 아이 화면 · 서버 src(개발용 점검 쪽 밖)의 코드에 getUserMedia · MediaRecorder 쓰임이 없다", () => {
    const used = SRC.filter(
      (f) =>
        !f.file.startsWith("src/app/dev/") &&
        /getUserMedia|MediaRecorder/.test(codeOf(f.text)),
    ).map((f) => f.file);
    expect(used).toEqual([]);
  });

  it("AC-27q 이야기 방식 호출 입력을 만드는 파일은 아이 이름 칸(영어 이름 · 한글 이름 · 별명)을 읽지 않는다", () => {
    const named = chatFiles
      .filter((f) =>
        /\b(englishName|displayName|toriNickname)\b/.test(codeOf(f.text)),
      )
      .map((f) => f.file);
    expect(named).toEqual([]);
  });
});

// 회화 이야기 방식 턴 하나의 판단(intent 2026-11-13-회화-대화-구조-R plan 묶음 S1 — core chat-turn-plan · 서버 턴 길이 부르는 순수 몫).
// 서버 턴 길(chat-turn.ts)과 같은 함수 차례를 DB 없이 흉내 낸 수업으로, 말이 적은 아이의 차례(조용함 · 모름 단추 · 말소리 없음 · 조용함 뒤 말함 ·
// 조용함 다시 보냄)마다 저장될 행과 끝 줄 신호를 본다. 흘린 줄과 저장 글의 대조 · 입구를 받는 조건 · 대화 기록 · 다시 흘림 · 인식기 알림 · 상태의
// 거름 자리 · 턴 요청 꼴 · 수준 검사의 자도 본다. 통합 몫(DB · 가짜 Anthropic)은 tests/integration/talk-chat-turn.test.ts 다(CI 가 돌림).
import { describe, expect, it } from "vitest";
import {
  CHAT_LANGUAGE_TEMPLATE,
  CHAT_QUESTION_MAX,
  CHAT_SENTENCE_MAX,
  type TalkChatOutput,
} from "@/core/ai/calls/talk-chat";
import { isSupportMove } from "@/core/conversation/chances";
import { chatChildHintOf } from "@/core/conversation/chat-hints";
import {
  type ChatInput,
  chatInputLineOf,
} from "@/core/conversation/chat-message";
import {
  type ChatReplyCheck,
  chatReplyOf,
} from "@/core/conversation/chat-reply";
import {
  CHAT_OPENS,
  type ChatOpen,
  chatCardGreetingLineOf,
  chatChildFieldsOf,
  chatFallbackReplyOf,
  chatFirstQuestionBlocksOf,
  chatHistoryOf,
  chatMetCountOf,
  chatOpenAcceptsOf,
  chatOpenInputOf,
  chatOpenReplayOf,
  chatPrevStageOf,
  chatReplayLinesOf,
  chatSignalOfRows,
  chatTeacherRowMoveOf,
  chatTurnFinishOf,
  chatTurnInputOf,
  chatTurnPlanOf,
  createChatSentenceFlow,
  foldChatLine,
} from "@/core/conversation/chat-turn-plan";
import { chatTurnResultOf } from "@/core/conversation/chat-turn-result";
import { talkLessonPositionOf } from "@/core/conversation/lesson-flow";
import type { TalkLessonSettings } from "@/core/conversation/lesson-turns";
import { readTalkMove } from "@/core/conversation/move";
import type { LowLevelLineOptions } from "@/core/conversation/question-check";
import { splitSentences } from "@/core/seed/text";
import {
  chatTurnAppliesOf,
  lessonNextOf,
  lessonWrapLinesOf,
} from "@/server/conversation/lesson-turn";
import {
  lessonFlowTurnsOf,
  type TalkTurnRow,
} from "@/server/conversation/state";
import { parseTalkTurnRequest } from "@/server/conversation/turn";
import {
  CARD3,
  CARD4,
  LOW,
  NEW3,
  SPEC3,
  teacher,
} from "../fixtures/talk-lesson";
import {
  chatDontKnowBody,
  chatOpenBody,
  chatSayBody,
} from "../integration/talk-chat-requests";

// ── 재료 ───────────────────────────────────────────────────────────

const CHAT_START = { leadMode: "chat" as const };
const RULES = { unsureConfidence: 0.5, unsureOnPartial: false };
const SAFETY_MAX = 80;

const range: LowLevelLineOptions = {
  sentenceMaxWords: 8,
  allowedWords: new Set(
    "i you we it a the like likes cats cat dogs dog do what is are and or say with me fine am okay that good yes no park play hello how nice your turn about".split(
      " ",
    ),
  ),
  unitWords: ["play"],
  childWords: [],
  teacherName: "Mina",
  lemmaOf: (s) => s.toLowerCase(),
  forms: [],
  allowedForms: new Set(),
};
const CHECK: ChatReplyCheck = {
  range,
  sentenceMax: CHAT_SENTENCE_MAX,
  questionMax: CHAT_QUESTION_MAX,
  madeUpPhrases: [],
};

let seq = 0;
/** talk_turns 행 하나(빈 칸은 null — 서버 TalkTurnRow 꼴). */
function rowOf(
  over: Partial<TalkTurnRow> &
    Pick<TalkTurnRow, "speaker" | "turnNo" | "segment">,
): TalkTurnRow {
  seq += 1;
  return {
    id: `row-${seq}`,
    sessionId: "session-1",
    clientAttemptId: null,
    text: null,
    inputMode: null,
    hintKind: null,
    hintLevel: null,
    heardHelp: null,
    targetWords: null,
    askKind: null,
    selfUsedWords: null,
    stuckPhrase: null,
    askAgain: null,
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
    chatJudge: null,
    recordedAt: new Date(0),
    ...over,
  };
}

type Entry =
  | { kind: "say"; text: string }
  | { kind: "dont_know" }
  | { kind: "not_heard" }
  | { kind: "quiet" }
  | { kind: "open"; open: Exclude<ChatOpen, "quiet"> };

/**
 * 서버 턴 길의 걸음을 흉내 낸 이야기 방식 수업(3단계 카드 CARD3 — 인사 둘 · 짧은 준비 있음): 아이 행 저장(입력 방식 · 글 · 말소리 없음 출처) →
 * 거른 흐름으로 되짚은 위치 → 부르기 전 판단 → 응답 처리(가짜 say) → 받침 단계 · 잇달아 말한 수 · 끝 줄 신호 → 아이 행 칸 · 선생님 행 move.
 * 인사가 끝나 짧은 준비가 열리면 대화 토막으로 넘긴다(묶음 S2 의 몫을 흉내 냄).
 */
function lessonSim(settings: TalkLessonSettings = LOW) {
  const rows: TalkTurnRow[] = [];
  let segment: "greeting" | "talk" | "more_talk" = "greeting";
  let prepWords: string[] = [];
  const argsOf = () => ({
    spec: SPEC3,
    card: CARD3,
    newWords: NEW3,
    turns: lessonFlowTurnsOf(rows, { start: CHAT_START, level: 3 }),
    segment,
    settings,
    prepWords,
  });
  const position = () => talkLessonPositionOf(argsOf());
  function step(
    entry: Entry,
    say = "Can you tell me more?",
    listen = "",
    wrapUp = false,
  ) {
    const args = argsOf();
    const before = talkLessonPositionOf(args);
    const turnNo = rows.findLast((r) => r.speaker === "tori")?.turnNo ?? 0;
    let child: TalkTurnRow | null = null;
    if (entry.kind === "say")
      child = rowOf({
        speaker: "child",
        turnNo,
        segment,
        inputMode: "speech",
        text: entry.text,
      });
    else if (entry.kind === "dont_know" || entry.kind === "not_heard")
      child = rowOf({
        speaker: "child",
        turnNo,
        segment,
        inputMode: "dont_know",
        clientListen:
          entry.kind === "not_heard" ? { src: "nospeech" } : { src: "button" },
      });
    else if (entry.kind === "quiet")
      child = rowOf({ speaker: "child", turnNo, segment, inputMode: "quiet" });
    const input: ChatInput =
      child !== null
        ? chatTurnInputOf(child, undefined, RULES)
        : chatOpenInputOf(
            entry.kind === "open" ? entry.open : "more",
            entry.kind === "open" && entry.open === "start"
              ? { clock: { weekday: "Friday", dayPart: "evening" }, met: 0 }
              : null,
          );
    const plan = chatTurnPlanOf({
      input,
      child,
      args,
      position: before,
      rows,
      segment,
      prepOpens: true,
      safetyMaxTurns: SAFETY_MAX,
      settings,
    });
    const reply = chatReplyOf({
      level: 3,
      output: { listen_sentence: listen, say, say_ko: "", wrap_up: wrapUp },
      appStuck: plan.appStuck,
      closingSlot: plan.closing,
      wrapUpHeldAt: plan.wrapUpHeldAt,
      check: CHECK,
    });
    const finish = chatTurnFinishOf({
      plan,
      wrapUp: reply.wrapUp,
      prevStage: chatPrevStageOf(rows),
      rowsAfter: child !== null ? [...rows, child] : rows,
      aiResting: false,
      settings: { lesson: settings, chat: settings.chat },
    });
    // 아이 행 칸: 힌트를 누르지 않은 차례(연 단 0) — 이어진 막힘 수는 이번 아이 행을 넣기 전 위치의 값
    const hint = chatChildHintOf({
      record: null,
      opened: 0,
      stuckRun: before.stuckInSlot,
      heard: [],
    });
    const fields =
      child === null
        ? null
        : chatChildFieldsOf({ input, sentUserMessage: "(msg)", hint });
    if (child !== null && fields !== null) rows.push({ ...child, ...fields });
    const move = chatTeacherRowMoveOf({
      plan,
      reply,
      text: reply.text,
      stage: finish.stage,
      run: finish.run,
      gate: [],
      firstMs: 900,
    });
    rows.push(
      rowOf({
        speaker: "tori",
        turnNo: turnNo + 1,
        segment,
        text: reply.text,
        toriRewrite: JSON.stringify({ say }),
        move,
        sentUserMessage: child === null ? chatInputLineOf(input) : null,
      }),
    );
    if (plan.prepNext) {
      segment = "talk";
      prepWords = [...(CARD3.prep ?? [])];
    }
    return { plan, finish, fields, before, after: position(), move, input };
  }
  const accepts = (open: ChatOpen, orphan: TalkTurnRow | null = null) =>
    chatOpenAcceptsOf(open, {
      segment,
      position: position(),
      rows,
      orphan,
      settings: settings.chat,
    });
  /** 첫 말 → 인사 둘(말) → 인사 끝(짧은 준비) → 돌아옴까지 온 수업. */
  function toTalk() {
    step({ kind: "open", open: "start" }, "Hi! How are you today?");
    step({ kind: "say", text: "I'm good." }, "Great! Do you like Sunday?");
    step({ kind: "say", text: "Yes." }, "Me too!");
    step({ kind: "open", open: "back" }, "We are back! What do you play?");
  }
  return { rows, step, position, accepts, toTalk };
}

// ── 수준 검사의 자 ───────────────────────────────────────────────────

describe("수준 검사의 자(spec 설계 2 · 4 · 보완 4 (12))", () => {
  it("AC-27d 수준 검사의 자(문장 2 · 물음 1)는 안내문 글의 'one or two short sentences' · 'At most one question' 과 같은 수다", () => {
    const words = ["zero", "one", "two", "three"];
    expect(CHAT_LANGUAGE_TEMPLATE).toContain(
      `one or ${words[CHAT_SENTENCE_MAX]} short sentences`,
    );
    expect(CHAT_LANGUAGE_TEMPLATE).toContain(
      `At most ${words[CHAT_QUESTION_MAX]} question`,
    );
  });
});

// ── 상태의 거름 자리 · 갈림 ─────────────────────────────────────────────

describe("quiet 행을 거르는 한 자리(state.ts lessonFlowTurnsOf — 보완 4 (1))", () => {
  const live = [
    rowOf({ speaker: "tori", turnNo: 1, segment: "talk", text: "Hi!" }),
    rowOf({ speaker: "child", turnNo: 1, segment: "talk", inputMode: "quiet" }),
    rowOf({ speaker: "tori", turnNo: 2, segment: "talk", text: "Hello?" }),
    rowOf({
      speaker: "child",
      turnNo: 2,
      segment: "talk",
      inputMode: "speech",
      text: "Hi.",
    }),
  ];

  it("AC-27f 이야기 방식 수업은 quiet 행을 빼고 흐름 꼴로 읽는다(던지지 않음)", () => {
    const turns = lessonFlowTurnsOf(live, { start: CHAT_START, level: 3 });
    expect(turns.map((t) => t.speaker)).toEqual([
      "teacher",
      "teacher",
      "child",
    ]);
  });

  it("AC-27f 기존 두 방식은 거르지 않는다: quiet 행이 있으면 좁히는 함수가 던지고(안전망), 없으면 고치기 전과 같은 흐름 꼴이다", () => {
    for (const start of [null, { leadMode: "claude" as const }]) {
      expect(() => lessonFlowTurnsOf(live, { start, level: 3 })).toThrow();
      const plain = live.filter((r) => r.inputMode !== "quiet");
      expect(lessonFlowTurnsOf(plain, { start, level: 3 })).toEqual(
        lessonFlowTurnsOf(plain, { start: CHAT_START, level: 3 }),
      );
    }
    // 4단계부터는 chat 스냅숏이어도 이야기 방식이 아니다(거르지 않음)
    expect(() =>
      lessonFlowTurnsOf(live, { start: CHAT_START, level: 4 }),
    ).toThrow();
  });

  it("AC-27s 갈림(chatTurnAppliesOf): 이야기 방식 수업의 인사 · 대화 · 더 이야기하기 토막만 참이고 app · claude · 짧은 준비 · 정리는 거짓이다", () => {
    for (const segment of ["greeting", "talk", "more_talk"] as const) {
      expect(chatTurnAppliesOf({ start: CHAT_START, level: 3, segment })).toBe(
        true,
      );
      expect(chatTurnAppliesOf({ start: null, level: 3, segment })).toBe(false);
      expect(
        chatTurnAppliesOf({
          start: { leadMode: "claude" },
          level: 3,
          segment,
        }),
      ).toBe(false);
    }
    for (const segment of ["prep", "wrap_up"] as const)
      expect(chatTurnAppliesOf({ start: CHAT_START, level: 3, segment })).toBe(
        false,
      );
  });
});

// ── 말이 적은 아이(브리프 11) ─────────────────────────────────────────

describe("말이 적은 아이의 차례: 저장될 행과 끝 줄 신호", () => {
  it("AC-27f 조용함 → 조용함 → 상한: 잇달아 말한 수 1 · 2, 둘째 뒤 기다림 시간이 빠지고 셋째 조용함 입구는 받지 않는다", () => {
    const sim = lessonSim();
    sim.toTalk();
    const talkBefore = sim.position().talkCount;
    expect(sim.accepts("quiet")).toBe(true);
    const a = sim.step({ kind: "quiet" }, "Do you like soccer or tennis?");
    expect(a.finish.run).toBe(1);
    expect(a.finish.signal).toEqual({
      quietSeconds: LOW.chat.quietSeconds,
      hint: true,
      alternatives: LOW.chat.alternatives,
    });
    expect(a.fields).toMatchObject({
      saidWords: [],
      selfUsedWords: [],
      stuckPhrase: null,
      hintKind: "none",
      hintLevel: 0,
    });
    expect(readTalkMove(a.move)?.chat).toMatchObject({ quiet: true, run: 1 });
    expect(sim.accepts("quiet")).toBe(true);
    const b = sim.step({ kind: "quiet" }, "I like soccer. It is fun!");
    expect(b.finish.run).toBe(LOW.chat.teacherRunMax);
    expect(b.finish.signal.quietSeconds).toBeUndefined();
    expect(b.finish.signal.hint).toBe(true);
    expect(sim.accepts("quiet")).toBe(false);
    // quiet 행은 흐름(참고 턴 · 막힘)에 들지 않는다
    expect(sim.position().childTurns).toBe(2);
    expect(sim.position().talkCount).toBe(talkBefore);
  });

  it("AC-27f 모름 단추가 이어짐: 받침 단계 1 · 2 · 3, 넣기 전 자리 막힘 수 0 · 1 · 2(힌트 종류의 이어진 막힘 수), 이번 아이 행 뒤 1 · 2 · 3, 끝 줄(저장 뒤 위치)의 자리 막힘 수 1 · 2 · 0, 설명 기다림이 실린다", () => {
    const sim = lessonSim();
    sim.toTalk();
    const steps = [0, 1, 2].map(() =>
      sim.step({ kind: "dont_know" }, "That's okay. Do you play soccer?"),
    );
    expect(steps.map((s) => s.finish.stage)).toEqual([1, 2, 3]);
    expect(steps.map((s) => s.before.stuckInSlot)).toEqual([0, 1, 2]);
    expect(steps.map((s) => s.plan.positionAfter.stuckInSlot)).toEqual([
      1, 2, 3,
    ]);
    // 끝 줄은 지금 길처럼 저장 뒤 상태(lessonNextOf)의 값 — 닫기(3) 행 뒤에는 새 자리라 0 이다
    expect(steps.map((s) => s.after.stuckInSlot)).toEqual([1, 2, 0]);
    for (const s of steps) {
      expect(s.finish.signal.explainWait).toBe(LOW.chat.explainWaitSeconds);
      expect(s.fields?.stuckPhrase).toBeNull();
    }
    // 받침 단계와 chat 묶음이 함께 있다(받침 행 — 위치 되짚기가 막힌 횟수를 잇는다)
    expect(isSupportMove(steps[0]?.move ?? null)).toBe(true);
    expect(readTalkMove(steps[1]?.move)?.chat).toBeDefined();
    // 이어진 둘째 막힘부터는 힌트를 마지막 단까지 연 것으로 센다(단이 있는 차례)
    const tiers = {
      tiers: [
        { kind: "ko" as const, text: "축구" },
        { kind: "sentence" as const, text: "I play soccer." },
      ],
      explainKo: "",
    };
    const at = (stuckRun: number) =>
      chatChildHintOf({ record: tiers, opened: 0, stuckRun, heard: [] });
    expect(steps.map((s) => at(s.before.stuckInSlot).hintLevel)).toEqual([
      0, 0, 2,
    ]);
  });

  it("AC-27f 조용함 사이의 모름 단추: 조용함 차례는 앞 받침 단계를 잇고 막힌 횟수를 0 으로 돌리지 않는다", () => {
    const sim = lessonSim();
    sim.toTalk();
    const a = sim.step({ kind: "dont_know" }, "It's okay. Is it fun?");
    const q = sim.step({ kind: "quiet" }, "Yes or no?");
    const b = sim.step({ kind: "dont_know" }, "No problem. Do you like it?");
    expect([a.finish.stage, q.finish.stage, b.finish.stage]).toEqual([1, 1, 2]);
    expect(b.before.stuckInSlot).toBe(1);
    expect(b.plan.positionAfter.stuckInSlot).toBe(2);
  });

  it("AC-27f 말소리 없음 → 조용함 → 말소리 없음: 기기 쪽 차례라 막힘 · 설명 기다림이 없고, 조용함은 말소리 없음 셈을 끊지 않는다", () => {
    const sim = lessonSim();
    sim.toTalk();
    const a = sim.step({ kind: "not_heard" }, "Hmm, I didn't hear you.");
    const q = sim.step({ kind: "quiet" }, "Are you there?");
    const b = sim.step({ kind: "not_heard" }, "Let's try again.");
    expect(a.input).toEqual({ kind: "not_heard" });
    for (const s of [a, q, b]) {
      expect(s.finish.stage).toBe(0);
      expect(s.finish.signal.explainWait).toBeUndefined();
    }
    expect([a.finish.run, q.finish.run, b.finish.run]).toEqual([0, 1, 0]);
    expect(a.after.silentRun).toBe(1);
    expect(b.after.silentRun).toBe(2);
    expect(a.after.flashDontKnow).toBe(true);
  });

  it("AC-27f 조용함 뒤 말함: 잇달아 말한 수가 0 으로 끊기고 말 차례로 센다(평가는 말 입력 차례만)", () => {
    const sim = lessonSim();
    sim.toTalk();
    const talkBefore = sim.position().talkCount;
    sim.step({ kind: "quiet" }, "Soccer or tennis?");
    expect(sim.position().talkCount).toBe(talkBefore);
    const s = sim.step({ kind: "say", text: "Soccer!" }, "Soccer is fun!");
    expect(s.finish.run).toBe(0);
    expect(s.finish.signal.quietSeconds).toBe(LOW.chat.quietSeconds);
    expect(s.fields).toMatchObject({ saidWords: [], stuckPhrase: null });
    expect(sim.position().talkCount).toBe(talkBefore + 1);
  });

  it("AC-27f 조용함 요청이 실패한 뒤 다시 보냄: 고아로 남은 quiet 행이면 받고(행을 다시 씀), 다른 아이 행이 고아면 받지 않는다", () => {
    const sim = lessonSim();
    sim.toTalk();
    const turnNo = sim.rows.at(-1)?.turnNo ?? 0;
    const quietOrphan = rowOf({
      speaker: "child",
      turnNo,
      segment: "talk",
      inputMode: "quiet",
    });
    const speechOrphan = rowOf({
      speaker: "child",
      turnNo,
      segment: "talk",
      inputMode: "speech",
      text: "Hi.",
    });
    expect(sim.accepts("quiet", quietOrphan)).toBe(true);
    expect(sim.accepts("quiet", speechOrphan)).toBe(false);
    expect(sim.accepts("more", quietOrphan)).toBe(false);
  });

  it("AC-27f 막힘 말('I don't know.')은 앱이 아는 막힘이라 막힘 말 칸을 채우고 받침 단계를 적는다", () => {
    const sim = lessonSim();
    sim.toTalk();
    const s = sim.step(
      { kind: "say", text: "I don't know." },
      "That's fine. Soccer or tennis?",
    );
    expect(s.plan.appStuck).toBe(true);
    expect(s.fields?.stuckPhrase).toBe("I don't know.");
    expect(s.finish.stage).toBe(1);
  });
});

// ── 입구 · 인사 · 사실 줄 ─────────────────────────────────────────────

describe("입구와 인사 토막(spec 설계 3 · 5 · 보완 4 (5))", () => {
  it("AC-27c 수업 첫 말은 행이 없는 인사 토막에서만 받고, 그 차례의 wrap_up 참은 거짓으로 다룬다", () => {
    const sim = lessonSim();
    expect(sim.accepts("start")).toBe(true);
    expect(sim.accepts("quiet")).toBe(false);
    expect(sim.accepts("back")).toBe(false);
    const s = sim.step({ kind: "open", open: "start" }, "Hi!");
    expect(s.plan.wrapUpHeldAt).toBe("start");
    expect(s.plan.facts).toEqual([]);
    expect(sim.accepts("start")).toBe(false);
  });

  it("AC-27c 인사 끝 차례(짧은 준비가 열림)는 사실 줄 prep_next 를 붙이고 끝 줄 신호를 비운다 — 돌아옴(back)은 그 뒤 대화 첫 질문 차례에만 받고 그 행이 대화 첫 선생님 행이다", () => {
    const sim = lessonSim();
    sim.step({ kind: "open", open: "start" }, "Hi! How are you today?");
    sim.step({ kind: "say", text: "I'm good." }, "Great! Do you like Sunday?");
    const end = sim.step({ kind: "say", text: "Yes." }, "Me too!");
    expect(end.plan.greetingEnd).toBe(true);
    expect(end.plan.facts).toEqual([{ kind: "prep_next" }]);
    expect(end.finish.signal).toEqual({});
    expect(sim.accepts("back")).toBe(true);
    expect(sim.accepts("quiet")).toBe(false);
    expect(chatFirstQuestionBlocksOf(sim.position())).toBe(true);
    const back = sim.step({ kind: "open", open: "back" }, "We are back!");
    expect(back.plan.wrapUpHeldAt).toBe("back");
    expect(back.move.kind).toBe("first_question");
    expect(sim.position().firstQuestionDue).toBe(false);
    expect(sim.accepts("back")).toBe(false);
    expect(sim.accepts("quiet")).toBe(true);
  });

  it("AC-27c 짧은 준비가 열리지 않은 수업은 대화 첫 질문 차례로 아이 차례를 막지 않는다(호출 사이에 끼우는 차례가 없음)", () => {
    expect(
      chatFirstQuestionBlocksOf({
        firstQuestionDue: true,
        prepOpened: false,
        prepPending: false,
      }),
    ).toBe(false);
    expect(
      chatFirstQuestionBlocksOf({
        firstQuestionDue: true,
        prepOpened: true,
        prepPending: false,
      }),
    ).toBe(true);
  });

  it("AC-27k 이 아이 차례로 안전 상한에 닿으면(조용함 포함, 거르지 않은 행으로 셈) 사실 줄 last_turn 만 붙이고 마무리 · 짧은 준비 줄은 붙이지 않는다", () => {
    const sim = lessonSim();
    sim.toTalk();
    sim.step({ kind: "quiet" }, "Soccer or tennis?");
    const rows = sim.rows;
    const childRows = rows.filter((r) => r.speaker === "child").length;
    const plan = chatTurnPlanOf({
      input: { kind: "quiet" },
      child: { inputMode: "quiet", clientListen: null },
      args: {
        spec: SPEC3,
        card: CARD3,
        newWords: NEW3,
        turns: lessonFlowTurnsOf(rows, { start: CHAT_START, level: 3 }),
        segment: "talk",
        settings: LOW,
        prepWords: [...(CARD3.prep ?? [])],
      },
      position: sim.position(),
      rows,
      segment: "talk",
      prepOpens: true,
      safetyMaxTurns: childRows + 1,
      settings: LOW,
    });
    expect(plan.lastTurn).toBe(true);
    expect(plan.facts).toEqual([{ kind: "last_turn" }]);
    // 거른 셈(quiet 빠짐)으로는 아직 닿지 않는다
    expect(sim.position().childTurns + 1).toBeLessThan(childRows + 1);
  });

  it("AC-27c 입구 다시 보냄: 그 입구가 쓴 이야기 방식 행(메시지 · chat 묶음)이면 다시 흘리고, quiet 는 다시 흘리지 않는다", () => {
    const sim = lessonSim();
    sim.step({ kind: "open", open: "start" }, "Hi!");
    const last = sim.rows.at(-1);
    const withStart = {
      ...last,
      sentUserMessage:
        "(The chat starts now. It is Friday evening. This is your first chat with this child. Say hello.)",
    } as TalkTurnRow;
    expect(chatOpenReplayOf("start", withStart, false)).toBe(true);
    expect(chatOpenReplayOf("more", withStart, false)).toBe(false);
    expect(chatOpenReplayOf("quiet", withStart, false)).toBe(false);
    const more = {
      ...withStart,
      sentUserMessage: "(The child chose to talk more.)",
    };
    expect(chatOpenReplayOf("more", more, false)).toBe(true);
    expect(chatOpenReplayOf("start", { ...withStart, move: null }, false)).toBe(
      false,
    );
  });

  it("AC-27c 입구 값은 넷이고 start 만 시각 · 만남 수를 싣는다", () => {
    expect([...CHAT_OPENS]).toEqual(["start", "more", "quiet", "back"]);
    expect(chatOpenInputOf("more", null)).toEqual({ kind: "more" });
    expect(chatOpenInputOf("back", null)).toEqual({ kind: "back" });
    expect(() => chatOpenInputOf("start", null)).toThrow();
  });

  it("AC-27c 수업 시작의 만남 수: 같은 선생님 · 정리까지 닫힌 다른 세션만 센다(방식 무관)", () => {
    expect(
      chatMetCountOf(
        [
          { id: "a", segment: "wrap_up", teacherKey: "mina" },
          { id: "a", segment: "wrap_up", teacherKey: null },
          { id: "b", segment: "talk", teacherKey: "mina" },
          { id: "c", segment: "wrap_up", teacherKey: "rio" },
          { id: "now", segment: "wrap_up", teacherKey: "mina" },
        ],
        { sessionId: "now", teacherKey: "mina" },
      ),
    ).toBe(1);
  });

  it("AC-27c 첫 말이 실패하거나 'AI 쉬는 중'이면 쓰는 카드 인사 첫 줄(1~3단계 질문 · 4단계부터 첫 말)", () => {
    expect(chatCardGreetingLineOf(CARD3)).toEqual({
      en: "How are you today?",
      ko: "오늘 기분 어때?",
    });
    expect(chatCardGreetingLineOf(CARD4)).toEqual({
      en: "Hi! How was your day?",
      ko: "안녕! 오늘 어땠어?",
    });
  });
});

// ── 흘린 줄과 저장 글(브리프 3) ─────────────────────────────────────────

describe("흘리는 동안 잡아 두기와 끝의 말풍선 글", () => {
  const output = (say: string, listen = ""): TalkChatOutput => ({
    listen_sentence: listen,
    say,
    say_ko: "",
    wrap_up: false,
  });
  /** 흘림(문장마다 판단) → 본체 → 남은 문장: 흘린 줄을 이은 글 = 저장 글 = 본체 글. */
  function run(
    say: string,
    opts: { listen?: string; appStuck?: boolean; listens?: string[] } = {},
  ) {
    const listen = opts.listen ?? "";
    const appStuck = opts.appStuck ?? false;
    const listens = opts.listens ?? [listen];
    const flow = createChatSentenceFlow({ level: 3, appStuck, holdAll: false });
    for (const l of listens) flow.listen(l);
    const lines: string[] = [];
    for (const sentence of splitSentences(say))
      if (flow.accept(sentence)) lines.push(sentence);
    const reply = chatReplyOf({
      level: 3,
      output: output(say, listen),
      appStuck,
      closingSlot: false,
      wrapUpHeldAt: null,
      check: CHECK,
    });
    // 끝의 남은 문장 · 행 글은 core 의 응답 갈래 조립(chatTurnResultOf)이 정한다(서버 턴 길과 같은 함수)
    const turns = [teacher("Do you like cats?", { kind: "ai" })];
    const args = {
      spec: SPEC3,
      card: CARD3,
      newWords: NEW3,
      turns,
      segment: "talk" as const,
      settings: LOW,
      prepWords: [...(CARD3.prep ?? [])],
    };
    const input: ChatInput = appStuck
      ? { kind: "dont_know" }
      : { kind: "speech", heard: "Yes." };
    const plan = chatTurnPlanOf({
      input,
      child: {
        inputMode: appStuck ? "dont_know" : "speech",
        clientListen: null,
      },
      args,
      position: talkLessonPositionOf(args),
      rows: [],
      segment: "talk",
      prepOpens: true,
      safetyMaxTurns: SAFETY_MAX,
      settings: LOW,
    });
    const result = chatTurnResultOf({
      plan,
      call: {
        kind: "ok",
        value: output(say, listen),
        assistant: "{}",
        blocked: [],
        listenBlocked: false,
        overLength: 0,
        sentSentences: splitSentences(say),
        firstSentenceMs: 0,
      },
      flow: { sent: flow.sent(), held: flow.held() },
      level: 3,
      koMeaning: false,
      check: CHECK,
      card: {
        ...CARD3,
        safeLines: [{ en: "Okay." }],
        safetyFarewell: { en: "Bye!" },
      },
      safeLine: "Okay.",
      turnNo: 1,
      sentenceMax: 3,
      prevStage: 0,
      rowsAfter: [],
      settings: { lesson: LOW, chat: LOW.chat },
      lexicon: { unitWords: [], lemmaOf: () => undefined },
    });
    for (const line of result.lines) if (line.t === "s") lines.push(line.en);
    const shown = [result.teacher?.text ?? ""];
    return { lines, shown, reply, held: flow.held(), result };
  }

  it("AC-27d 따라 할 문장이 든 문장부터 잡아 두고, 흘린 줄을 이은 글이 저장 글 · 본체 글과 같으며 소리 줄은 본체의 값이다", () => {
    const r = run("Nice! I like cats. What about you?", {
      listen: "I like cats.",
    });
    expect(r.held[0]).toBe("I like cats.");
    expect(r.lines.join(" ")).toBe(r.reply.text);
    expect(r.shown.join(" ")).toBe(r.reply.text);
    expect(r.reply.text).toBe("Nice! What about you?");
    expect(r.reply.sound.model).toBe("I like cats.");
  });

  it("AC-27d 앞 아이 차례가 막힘이면 물음 문장부터 잡아 두어, 소리 줄로 뺀 or 물음이 글로 먼저 나가지 않는다", () => {
    const r = run("That's okay. Do you like cats or dogs?", { appStuck: true });
    expect(r.lines).toEqual(["That's okay."]);
    expect(r.lines.join(" ")).toBe(r.reply.text);
    expect(r.reply.sound.answer).toBe("Do you like cats or dogs?");
  });

  it("AC-27d 따라 할 문장이 없는 차례는 모두 바로 흘리고 남은 문장이 없다", () => {
    const r = run("Hello! How are you?");
    expect(r.held).toEqual([]);
    expect(r.lines).toEqual(["Hello!", "How are you?"]);
  });

  it("AC-27b 따라 할 문장의 알림이 한 턴에 여러 번 오면(다시 시도) 마지막 값을 쓴다", () => {
    const r = run("Nice! I like cats.", {
      listen: "",
      listens: ["I like cats.", ""],
    });
    expect(r.held).toEqual([]);
    expect(r.lines).toEqual(["Nice!", "I like cats."]);
  });

  it("AC-27k 안전 상한 차례는 처음부터 모두 잡아 둔다(닫는 줄 하나로 낸다)", () => {
    const flow = createChatSentenceFlow({
      level: 3,
      appStuck: false,
      holdAll: true,
    });
    expect(flow.accept("Bye!")).toBe(false);
    expect(flow.held()).toEqual(["Bye!"]);
  });
});

// ── 선생님 행 move · 다시 흘림 · 신호 ───────────────────────────────────

describe("선생님 행 move 와 다시 흘림(브리프 4 · 7)", () => {
  const plan = {
    input: { kind: "dont_know" } as ChatInput,
    facts: [{ kind: "closing" as const }],
    closing: false,
    firstQuestion: false,
  };

  it("AC-27f move 에 받침 단계와 chat 묶음을 함께 적고, 까닭 칸은 비우며 문장 문 걸림은 겹치지 않게 적는다", () => {
    const move = chatTeacherRowMoveOf({
      plan,
      reply: chatFallbackReplyOf({ en: "It's okay." }),
      text: "It's okay.",
      stage: 2,
      run: 0,
      gate: ["meta", "meta", "listen_check"],
      firstMs: 1234.6,
    });
    expect(move.stage).toBe(2);
    expect(move.cause).toBeNull();
    expect(move.chat).toMatchObject({
      facts: ["closing"],
      run: 0,
      gate: ["meta", "listen_check"],
      firstMs: 1235,
    });
    expect(move.chat?.quiet).toBeUndefined();
  });

  it("AC-27d 다시 흘림은 글 · 뜻 · 소리 줄뿐이다(신호 말 · 마무리 상수 줄 없음 — 받침 단계를 적은 행도)", () => {
    const move = chatTeacherRowMoveOf({
      plan,
      reply: {
        ...chatFallbackReplyOf({ en: "Okay." }),
        sound: { model: "I like cats." },
      },
      text: "Okay. Your turn!",
      stage: 1,
      run: 0,
      gate: [],
      firstMs: null,
    });
    const lines = chatReplayLinesOf(
      { text: "Okay. Your turn!", toriKo: "괜찮아.", move },
      true,
    );
    expect(lines).toEqual([
      { t: "s", en: "Okay." },
      { t: "s", en: "Your turn!" },
      { t: "ko", ko: "괜찮아." },
      { t: "sound", kind: "model", say: "I like cats." },
    ]);
    expect(
      lines.some((l) => l.t !== "s" && l.t !== "ko" && l.t !== "sound"),
    ).toBe(false);
  });

  it("AC-27f 저장된 행으로 다시 정한 끝 줄 신호가 실시간 길의 신호와 같다", () => {
    const sim = lessonSim();
    sim.toTalk();
    const steps = [
      sim.step({ kind: "quiet" }, "Soccer or tennis?"),
      sim.step({ kind: "dont_know" }, "It's okay. Is it fun?"),
      sim.step({ kind: "say", text: "Yes!" }, "Great!"),
    ];
    const rows = sim.rows;
    let end = 0;
    for (const s of steps) {
      end = rows.findIndex(
        (r, i) => i > end && r.speaker === "tori" && r.move === s.move,
      );
      expect(
        chatSignalOfRows({
          rows: rows.slice(0, end + 1),
          aiResting: false,
          settings: LOW.chat,
        }),
      ).toEqual(s.finish.signal);
    }
  });
});

// ── 대화 기록 · 인식기 ─────────────────────────────────────────────────

describe("대화 기록과 인식기 알림(브리프 8 · 12)", () => {
  it("AC-27c 대화 기록은 저장된 글 그대로: 입구 차례는 선생님 행의 메시지, 아이 차례(quiet 포함)는 아이 행의 메시지, 기록 글이 없는 행은 뺀다", () => {
    const sim = lessonSim();
    sim.toTalk();
    sim.step({ kind: "quiet" }, "Soccer or tennis?");
    const rows = sim.rows.map((r) =>
      r.speaker === "tori" && r.text === "Me too!"
        ? { ...r, toriRewrite: null }
        : r,
    );
    const history = chatHistoryOf(rows);
    const tori = rows.filter(
      (r) => r.speaker === "tori" && r.toriRewrite !== null,
    );
    expect(history.map((h) => h.assistant)).toEqual(
      tori.map((r) => r.toriRewrite),
    );
    expect(history[0]?.user).toMatch(/^\(The chat starts now\./);
    expect(history.at(-1)?.user).toBe("(msg)");
  });

  it("AC-27l 들린 글과 다른 후보는 줄바꿈을 접고 알림 판단을 지난다(다른 후보는 확신 정도가 문턱 아래일 때만)", () => {
    expect(foldChatLine(" I like\r\n cats \n")).toBe("I like cats");
    const child = {
      inputMode: "speech",
      text: "I like\ncats",
      clientListen: null,
    };
    expect(
      chatTurnInputOf(
        child,
        { confidence: 0.3, alternative: "I like\nhats" },
        RULES,
      ),
    ).toEqual({
      kind: "speech",
      heard: "I like cats",
      note: { alternative: "I like hats" },
    });
    expect(
      chatTurnInputOf(child, { confidence: 0.9, alternative: "x" }, RULES),
    ).toEqual({ kind: "speech", heard: "I like cats" });
    expect(chatTurnInputOf({ ...child, text: "  " }, undefined, RULES)).toEqual(
      { kind: "not_heard" },
    );
    expect(
      chatTurnInputOf(
        {
          inputMode: "dont_know",
          text: null,
          clientListen: { src: "nospeech" },
        },
        undefined,
        RULES,
      ),
    ).toEqual({ kind: "not_heard" });
    expect(
      chatTurnInputOf(
        { inputMode: "quiet", text: null, clientListen: null },
        undefined,
        RULES,
      ),
    ).toEqual({ kind: "quiet" });
  });

  it("AC-27l 턴 요청은 인식기 칸과 입구 quiet · back 을 받고, 아이 말 요청의 input 칸은 그대로다", () => {
    const session = "00000000-0000-4000-8000-000000000001";
    for (const lead of ["quiet", "back"] as const)
      expect(parseTalkTurnRequest({ sessionId: session, lead })).toEqual({
        kind: "open",
        request: { sessionId: session, open: lead },
      });
    const child = {
      sessionId: session,
      clientAttemptId: "a1",
      input: { mode: "speech", text: "I like cats." },
      hint: { opened: 0, heard: [] },
      recognizer: { confidence: 0.4, alternative: "I like hats." },
    };
    expect(parseTalkTurnRequest(child)?.kind).toBe("child");
    expect(
      parseTalkTurnRequest({
        ...child,
        recognizer: { confidence: 2 },
      }),
    ).toBeNull();
    expect(
      parseTalkTurnRequest({ ...child, input: { mode: "quiet" } }),
    ).toBeNull();
  });
});

// ── 마무리 · 상수 물음 ────────────────────────────────────────────────

describe("마무리 차례(spec 설계 9)", () => {
  it("AC-27j 앱의 마무리 차례는 사실 줄 closing 을 붙이고 끝 줄은 두 단추 차례(신호 없음 · 설명 기다림만), move 는 마무리 자리이고 상수 물음을 붙이지 않는다", () => {
    const sim = lessonSim();
    sim.toTalk();
    let last: ReturnType<typeof sim.step> | null = null;
    for (let i = 0; i < SPEC3.targetTurns && !last?.plan.closing; i++)
      last = sim.step({ kind: "say", text: "I play soccer." }, "Cool!");
    expect(last?.plan.closing).toBe(true);
    expect(last?.plan.facts).toEqual([{ kind: "closing" }]);
    expect(last?.finish.end).toBe("closing");
    expect(last?.finish.signal).toEqual({});
    expect(last?.move.kind).toBe("closing_slot");
    expect(last?.move.app).toEqual([]);
    expect(sim.position().choice).toBe("closing");
  });
});

// ── 정리 되짚을 말의 출처(브리프 · plan S1 행 '정리 되짚을 말(lessonWrapLinesOf 의 출처만)') ───────────

describe("정리 되짚을 말의 출처", () => {
  it("AC-27j 이야기 방식 수업은 say 에 든 것으로 확인된 따라 할 문장을 되짚을 말로 쓰고(카드 대사보다 앞), 다른 방식은 지금 출처 그대로다", () => {
    const sim = lessonSim();
    sim.toTalk();
    sim.step(
      { kind: "say", text: "I play." },
      "Nice! I play soccer. Your turn!",
      "I play soccer.",
    );
    const state = {
      rows: sim.rows,
      card: {
        todayWords: [{ word: "soccer" }],
        closingLines: [{ en: "Bye!", ko: "안녕!" }],
      },
      spec: { koMeaning: false },
      lemmaOf: (s: string) => s.toLowerCase(),
      level: 3,
    } as unknown as Parameters<typeof lessonWrapLinesOf>[0];
    expect(lessonWrapLinesOf({ ...state, start: CHAT_START } as never)).toEqual(
      [{ en: "I play soccer." }],
    );
    expect(lessonWrapLinesOf({ ...state, start: null } as never)).toEqual([
      { en: "Bye!" },
    ]);
  });
});

// ── 고침 1(검토 rev-chat-s1 I-1 · M-3 · I-3) ──────────────────────────────

describe("'더 이야기하기' 입구의 다시 흘림(검토 I-1)", () => {
  it("AC-27k more 입구 차례가 마무리 제안(wrap_up 참)으로 끝나면 다음 more 는 다시 흘리지 않고 새로 부른다", () => {
    const sim = lessonSim();
    sim.toTalk();
    sim.step(
      { kind: "say", text: "I play soccer." },
      "You did great today!",
      "",
      true,
    );
    expect(sim.position().choice).toBe("suggestion");
    const more = sim.step(
      { kind: "open", open: "more" },
      "That was fun. See you!",
      "",
      true,
    );
    expect(more.move.next).toBe("closing");
    const last = sim.rows.at(-1);
    expect(sim.position().choice).toBe("suggestion");
    const accepts = sim.accepts("more");
    expect(accepts).toBe(true);
    expect(chatOpenReplayOf("more", last, accepts)).toBe(false);
  });

  it("AC-27k 같은 more 를 다시 보냈는데 새 more 를 받지 않는 상태(마무리 제안으로 끝나지 않음)면 지금처럼 다시 흘린다", () => {
    const sim = lessonSim();
    sim.toTalk();
    sim.step(
      { kind: "say", text: "I play soccer." },
      "You did great today!",
      "",
      true,
    );
    sim.step({ kind: "open", open: "more" }, "What else do you like?");
    const last = sim.rows.at(-1);
    const accepts = sim.accepts("more");
    expect(accepts).toBe(false);
    expect(chatOpenReplayOf("more", last, accepts)).toBe(true);
  });
});

describe("입구 입력 줄의 글은 P1 함수 하나(검토 M-3)", () => {
  it("AC-27c 다시 흘림 판단의 입구 줄은 chatInputLineOf 의 글과 같다", () => {
    const row = (sentUserMessage: string) =>
      ({
        speaker: "tori",
        sentUserMessage,
        move: chatTeacherRowMoveOf({
          plan: {
            input: { kind: "more" },
            facts: [],
            closing: false,
            firstQuestion: false,
          },
          reply: chatFallbackReplyOf({ en: "Hi." }),
          text: "Hi.",
          stage: 0,
          run: 0,
          gate: [],
          firstMs: null,
        }),
      }) as const;
    for (const open of ["more", "back"] as const)
      expect(
        chatOpenReplayOf(
          open,
          row(`(fact)\n${chatInputLineOf({ kind: open })}`),
          false,
        ),
      ).toBe(true);
    const start = chatInputLineOf({
      kind: "start",
      clock: { weekday: "Sunday", dayPart: "morning" },
      met: 3,
    });
    expect(chatOpenReplayOf("start", row(start), false)).toBe(true);
  });
});

describe("통합 시험의 요청 본문(검토 I-3)", () => {
  it("AC-27f 통합 시험이 보내는 요청 본문은 모두 턴 요청 규격을 지난다(말소리 없음은 input.nospeech)", () => {
    const session = "00000000-0000-4000-8000-000000000001";
    const bodies = [
      chatSayBody(session, "I am fine."),
      chatSayBody(session, "I like cats.", {
        recognizer: { confidence: 0.3, alternative: "I like hats." },
      }),
      chatDontKnowBody(session),
      chatDontKnowBody(session, true),
      ...(["start", "more", "quiet", "back"] as const).map((lead) =>
        chatOpenBody(session, lead),
      ),
    ];
    for (const body of bodies)
      expect(parseTalkTurnRequest(body)).not.toBeNull();
    expect(chatDontKnowBody(session, true)).toMatchObject({
      input: { mode: "dont_know", nospeech: true },
    });
    expect("clientListen" in chatDontKnowBody(session, true)).toBe(false);
  });
});

// ── 고침 2(토막 접점 검토 rev-chat-s2 6절 S1) ─────────────────────────────

describe("끝 줄의 대화 첫 질문 차례(chatFirstQuestionBlocksOf 와 짝)", () => {
  /** 인사를 마치고 짧은 준비 없이 대화 토막에 든 이야기 방식 수업의 끝 줄 재료(대화 첫 질문 행이 없어 firstQuestionDue 가 참으로 남음). */
  function stateOf(start: { leadMode: "chat" | "claude" } | null) {
    const sim = lessonSim();
    sim.step({ kind: "open", open: "start" }, "Hi! How are you today?");
    sim.step({ kind: "say", text: "I'm good." }, "Great! Do you like Sunday?");
    sim.step({ kind: "say", text: "Yes." }, "Me too!");
    const turns = lessonFlowTurnsOf(sim.rows, { start: CHAT_START, level: 3 });
    const position = talkLessonPositionOf({
      spec: SPEC3,
      card: CARD3,
      newWords: NEW3,
      turns,
      segment: "talk",
      settings: LOW,
      prepWords: [],
    });
    return {
      spec: SPEC3,
      card: CARD3,
      turns,
      liveRows: sim.rows,
      segment: "talk",
      position,
      session: { status: "in_progress" },
      start,
      level: 3,
    } as unknown as Parameters<typeof lessonNextOf>[0];
  }

  it("AC-27e 이야기 방식 수업의 끝 줄 firstQuestionDue 는 chatFirstQuestionBlocksOf 값이다(준비 없는 수업은 거짓 — 화면이 차례마다 자료를 다시 읽지 않게), 다른 방식은 위치 값 그대로", () => {
    const chat = stateOf(CHAT_START);
    expect(chat.position.firstQuestionDue).toBe(true);
    expect(lessonNextOf(chat).firstQuestionDue).toBe(
      chatFirstQuestionBlocksOf(chat.position),
    );
    expect(lessonNextOf(chat).firstQuestionDue).toBe(false);
    expect(lessonNextOf(stateOf(null)).firstQuestionDue).toBe(true);
    expect(lessonNextOf(stateOf({ leadMode: "claude" })).firstQuestionDue).toBe(
      true,
    );
  });
});

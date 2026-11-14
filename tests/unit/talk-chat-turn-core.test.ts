// 회화 이야기 방식 차례 판단(intent 2026-11-13-회화-대화-구조-R plan 묶음 P3 — spec 설계 3 · 6 · 7 · 8-2 · 9 · 10 · 11).
// 끝 줄 신호(기다림 시간 · 힌트 단추 · 설명 기다림 · 후보 수)와 싣지 않는 조건, 잇달아 말한 수, 사실 줄 고르기, 앱이 아는 막힘, quiet 행을 거른 행 목록
// (참고 턴 · 인사 차례 수 · silentRun · '참여가 거의 없음'), 안전 상한 셈, 평가 호출을 부를 차례를 본다.
import { describe, expect, it } from "vitest";
import type { ChatInput } from "@/core/conversation/chat-message";
import {
  CHAT_QUIET_INPUT_MODE,
  type ChatRowLike,
  chatAppStuckOf,
  chatChildFlowOf,
  chatChildTurnCountOf,
  chatClosingTurnOf,
  chatEndSignalOf,
  chatEvalAfterTeacherOf,
  chatEvalDueOf,
  chatEvalOnCloseOf,
  chatFactsOf,
  chatFlowRowsOf,
  chatGreetingEndOf,
  chatLastTurnOf,
  chatQuietAcceptsOf,
  chatSupportStageOf,
  chatTeacherRunOf,
  chatTurnEndOf,
} from "@/core/conversation/chat-turn-core";
import { talkNearlySilent } from "@/core/conversation/ending";
import { talkLessonPositionOf } from "@/core/conversation/lesson-flow";
import type {
  TalkChatSettings,
  TalkLessonChildTurn,
  TalkLessonSettings,
  TalkLessonTurn,
} from "@/core/conversation/lesson-turns";
import {
  TALK_SUPPORT_STAGE_EASY,
  TALK_SUPPORT_STAGE_MAX,
  TALK_SUPPORT_STAGE_TOGETHER,
} from "@/core/conversation/move";
import {
  CARD3,
  LOW,
  NEW3,
  SPEC3,
  said,
  teacher,
} from "../fixtures/talk-lesson";

// ── 시험 행(talk_turns 행과 구조가 맞는 최소 꼴 + 흐름 꼴) ─────────────────

/** DB 행 흉내: 화자 · 입력 방식 · 글과, quiet 아닌 행이면 흐름 꼴(lessonTurnOf 가 낼 값). */
type Row = ChatRowLike & { text: string | null; flow?: TalkLessonTurn };

const tori = (text = "Teacher line."): Row => ({
  speaker: "tori",
  inputMode: null,
  text,
  flow: teacher(text, { kind: "ai" }),
});
const speech = (
  text = "I like it.",
  over: Partial<Omit<TalkLessonChildTurn, "speaker">> = {},
): Row => ({
  speaker: "child",
  inputMode: "speech",
  text,
  flow: said(over),
});
const dontKnow = (
  over: Partial<Omit<TalkLessonChildTurn, "speaker">> = {},
): Row => ({
  speaker: "child",
  inputMode: "dont_know",
  text: null,
  flow: said({ input: "dont_know", ...over }),
});
const notHeard = (
  over: Partial<Omit<TalkLessonChildTurn, "speaker">> = {},
): Row => ({
  speaker: "child",
  inputMode: "dont_know",
  text: null,
  flow: said({ input: "dont_know", nospeech: true, ...over }),
});
const quiet = (): Row => ({
  speaker: "child",
  inputMode: CHAT_QUIET_INPUT_MODE,
  text: null,
});

/** 서버의 lessonTurnOf 흉내: quiet 행은 흐름이 읽는 두 값이 아니라 던진다(state.ts childInputModeOf 와 같은 규칙). */
function lessonTurnOf(row: Row): TalkLessonTurn {
  if (row.inputMode === CHAT_QUIET_INPUT_MODE || row.flow === undefined)
    throw new Error("quiet 행은 흐름 꼴로 읽지 않는다");
  return row.flow;
}
/** 거른 행 목록 → 흐름 꼴(서버가 lessonTurnOf 를 부르기 전에 거르는 꼴). */
const flowOf = (rows: readonly Row[]) => chatFlowRowsOf(rows).map(lessonTurnOf);

function positionOf(
  turns: readonly TalkLessonTurn[],
  over: {
    segment?: "greeting" | "talk" | "more_talk";
    prep?: boolean;
    settings?: TalkLessonSettings;
  } = {},
) {
  return talkLessonPositionOf({
    spec: SPEC3,
    card: CARD3,
    newWords: NEW3,
    turns,
    segment: over.segment ?? "talk",
    settings: over.settings ?? LOW,
    prepWords: over.prep === false ? [] : (CARD3.prep ?? []),
  });
}

const CHAT: Pick<
  TalkChatSettings,
  "quietSeconds" | "teacherRunMax" | "alternatives" | "explainWaitSeconds"
> = {
  quietSeconds: 8,
  teacherRunMax: 2,
  alternatives: 2,
  explainWaitSeconds: 6,
};

const SAY: ChatInput = { kind: "speech", heard: "I go to the park." };
const DK: ChatInput = { kind: "dont_know" };
const QUIET: ChatInput = { kind: "quiet" };
/** talk.dontknow_max 를 3 으로 둔 설정(받침 단계 견줌의 손으로 쓴 단계 1 · 2 · 3 과 맞춘다). */
const MAX3: TalkLessonSettings = { ...LOW, dontknowMax: 3 };
/** 고치기 전 코드로 뜬 값(fix 2 — chat 묶음 없는 행, 선생님 말에 물음 없음). */
const BEFORE_FIX = {
  greet: {
    greetingEnds: [false, false, false, false, false, false],
    stuckInSlot: [0, 1, 0, 1, 0, 1],
    phase: "greeting",
  },
  talk: { stuckInSlot: [0, 0, 1, 0, 1] },
} as const;

/** 이야기 방식 선생님 행의 기록 묶음 move.chat(묶음 P2 꼴 — 칸 값은 이 시험에서 읽지 않음). */
const CHAT_RECORD = { level: {}, madeUp: [], facts: [], run: 0 };

/** 받침 단계를 적은 선생님 행(기존 방식 받침 행과 같은 move.stage 꼴). chat 이 참이면 이야기 방식 행(move.chat 이 있음)이다. */
const toriStage = (text: string, stage: number, chat = false): Row => ({
  speaker: "tori",
  inputMode: null,
  text,
  flow: teacher(text, {
    kind: "ai",
    stage,
    ...(chat ? { chat: CHAT_RECORD } : {}),
  }),
});

/** 마지막 선생님 행의 받침 단계(행이 없거나 move 가 없으면 0). */
function lastStageOf(rows: readonly Row[]): number {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const flow = rows[i]?.flow;
    if (rows[i]?.speaker === "tori" && flow?.speaker === "teacher")
      return flow.move?.stage ?? 0;
  }
  return 0;
}

/**
 * 턴 길(S1)이 할 걸음을 흉내 낸 수업: 첫 선생님 인사 질문에서 시작해, 입력마다 (1) 거른 행으로 되짚은 위치로 인사 끝을 정하고 (2) 아이 행을 남기고
 * (3) 거른 행 + 이번 아이 행의 위치(positionAfter)로 받침 단계를 정해 (4) 그 단계를 적은 선생님 행을 남긴다. 인사가 끝나면 짧은 준비 뒤 돌아옴
 * 차례의 선생님 행을 하나 더 둔다. 선생님 말은 기본으로 물음이 있다(질문 자리를 연다). opts.text 를 주면 첫 인사 뒤 선생님 말을 모두 그 글로
 * 둔다(물음 없는 말 'I like Sunday.' 꼴). opts.chat 이 참이면(기본) 선생님 행이 이야기 방식 행(move.chat 이 있음)이고, 거짓이면 chat 묶음 없는 행이다.
 */
function play(
  inputs: readonly ChatInput[],
  settings: TalkLessonSettings,
  opts: { text?: string; chat?: boolean } = {},
) {
  const chat = opts.chat ?? true;
  const rows: Row[] = [toriStage("Hi! How are you?", 0)];
  const greetingEnds: boolean[] = [];
  const stages: number[] = [];
  const afters: ReturnType<typeof positionOf>[] = [];
  let seg: "greeting" | "talk" = "greeting";
  for (const input of inputs) {
    const before = positionOf(flowOf(rows), { segment: seg, settings });
    const greetingEnd = chatGreetingEndOf({
      input,
      position: before,
      settings,
    });
    const flow = chatChildFlowOf(input);
    if (input.kind === "quiet") rows.push(quiet());
    else if (flow !== null)
      rows.push({
        speaker: "child",
        inputMode: flow.input,
        text: input.kind === "speech" ? input.heard : null,
        flow: said({ ...flow, segment: seg }),
      });
    const after = positionOf(flowOf(rows), { segment: seg, settings });
    const stage = chatSupportStageOf({
      input,
      positionAfter: after,
      prevStage: lastStageOf(rows),
      settings,
    });
    rows.push(toriStage(opts.text ?? "Can you tell me more?", stage, chat));
    if (greetingEnd) {
      seg = "talk";
      rows.push(
        toriStage(opts.text ?? "We are back! What do you like?", 0, chat),
      );
    }
    greetingEnds.push(greetingEnd);
    stages.push(stage);
    afters.push(after);
  }
  return { rows, greetingEnds, stages, afters, seg };
}

// ── quiet 행을 거른 행 목록 ─────────────────────────────────────────

describe("quiet 행을 거른 행 목록(spec 설계 6 저장 문단)", () => {
  it("AC-27f 거른 목록은 quiet 아이 행만 빼고 차례와 요소를 그대로 둔다", () => {
    const rows = [tori("A"), quiet(), tori("B"), speech("Hi."), tori("C")];
    const out = chatFlowRowsOf(rows);
    expect(out).toEqual([rows[0], rows[2], rows[3], rows[4]]);
    // 같은 요소(같은 객체)를 돌려준다 — 서버 형의 칸이 그대로 남는다
    expect(out[2]).toBe(rows[3]);
  });

  it("AC-27f 거르지 않은 목록을 흐름 꼴로 읽으면 quiet 행에서 던진다(거름이 lessonTurnOf 앞이어야 하는 까닭)", () => {
    const rows = [tori(), quiet(), tori()];
    expect(() => rows.map(lessonTurnOf)).toThrow();
    expect(() => flowOf(rows)).not.toThrow();
  });

  it("AC-27f 말소리 없음 → quiet → 말소리 없음은 이어진 말소리 없음 둘", () => {
    const rows = [
      tori("Hi!"),
      speech("Hello.", { segment: "greeting" }),
      tori("Nice."),
      speech("Good.", { segment: "greeting" }),
      tori("What do you like?"),
      notHeard(),
      tori("Take your time."),
      quiet(),
      tori("Do you like parks?"),
      notHeard(),
    ];
    const pos = positionOf(flowOf(rows));
    expect(pos.silentRun).toBe(2);
    expect(pos.flashDontKnow).toBe(true);
  });

  it("AC-27f quiet 행은 참고 턴(말 주고받기 셈)에 들지 않는다", () => {
    const rows = [
      tori("Hi!"),
      speech("Hello.", { segment: "greeting" }),
      tori("Nice."),
      speech("Good.", { segment: "greeting" }),
      tori("What do you like?"),
      speech("Soccer."),
      tori("Cool."),
      quiet(),
      tori("Do you play?"),
      quiet(),
      tori("I play on Sunday."),
    ];
    const pos = positionOf(flowOf(rows));
    // 말로 답한 아이 차례 셋(인사 둘 + 대화 하나)만 센다
    expect(pos.talkCount).toBe(3);
  });

  it("AC-27f quiet 행은 인사 차례 수(greetingIndex)를 늘리지 않고 인사는 같은 자리에서 이어진다", () => {
    const rows = [tori("Hi! How are you?"), quiet(), tori("Are you there?")];
    const pos = positionOf(flowOf(rows), { segment: "greeting" });
    expect(pos.phase).toBe("greeting");
    expect(pos.greetingIndex).toBe(0);
    expect(pos.lastRow).toBe("teacher");
  });

  it("AC-27f 대화 토막에 quiet 행만 있으면 '참여가 거의 없음'이다", () => {
    const rows = [
      tori("Hi!"),
      speech("Hello.", { segment: "greeting" }),
      tori("Nice."),
      speech("Good.", { segment: "greeting" }),
      tori("What do you like?"),
      quiet(),
      tori("Do you like parks?"),
      quiet(),
      tori("I like parks."),
      dontKnow(),
    ];
    expect(talkNearlySilent(flowOf(rows))).toBe(true);
    // 말한 대화 차례가 하나 있으면 아니다
    expect(
      talkNearlySilent(flowOf([...rows, tori("Ok."), speech("Yes!")])),
    ).toBe(false);
  });
});

// ── 안전 상한 셈 · 잇달아 말한 수 ────────────────────────────────────

describe("안전 상한 셈(spec 설계 10) · 잇달아 말한 수(설계 6)", () => {
  it("AC-27k 안전 상한 셈은 quiet 행을 포함한 아이 행 전부다", () => {
    const rows = [
      tori(),
      speech(),
      tori(),
      quiet(),
      tori(),
      dontKnow(),
      tori(),
    ];
    expect(chatChildTurnCountOf(rows)).toBe(3);
  });

  it("AC-27k quiet 를 포함해 이 아이 차례로 talk.safety_max_turns 에 닿으면 안전 상한 차례다", () => {
    const rows = [tori(), speech(), tori(), quiet(), tori()];
    // 앞 아이 행 둘 + 이번 차례 = 3
    expect(
      chatLastTurnOf({ rows, input: { kind: "quiet" }, safetyMaxTurns: 3 }),
    ).toBe(true);
    expect(chatLastTurnOf({ rows, input: SAY, safetyMaxTurns: 3 })).toBe(true);
    expect(chatLastTurnOf({ rows, input: SAY, safetyMaxTurns: 4 })).toBe(false);
  });

  it("AC-27k 입구(start · more · back)는 아이 행을 만들지 않아 안전 상한 차례가 아니다", () => {
    const rows = [tori(), speech(), tori(), quiet(), tori()];
    for (const input of [
      { kind: "more" },
      { kind: "back" },
      {
        kind: "start",
        clock: { weekday: "Friday", dayPart: "evening" },
        met: 0,
      },
    ] as const)
      expect(chatLastTurnOf({ rows, input, safetyMaxTurns: 3 })).toBe(false);
  });

  it("AC-27f 잇달아 말한 수는 마지막 quiet 아닌 아이 행 뒤의 quiet 행 수다", () => {
    expect(chatTeacherRunOf([tori()])).toBe(0);
    expect(chatTeacherRunOf([tori(), speech(), tori()])).toBe(0);
    expect(chatTeacherRunOf([tori(), quiet(), tori()])).toBe(1);
    expect(
      chatTeacherRunOf([tori(), quiet(), tori(), speech(), tori(), quiet()]),
    ).toBe(1);
    expect(
      chatTeacherRunOf([tori(), speech(), tori(), quiet(), tori(), quiet()]),
    ).toBe(2);
    // 모름 단추 · 들리지 않음도 quiet 아닌 아이 행이라 셈을 끊는다
    expect(
      chatTeacherRunOf([tori(), quiet(), tori(), notHeard(), tori(), quiet()]),
    ).toBe(1);
  });

  it("AC-27f 서버는 잇달아 말한 수가 상한이면 quiet 를 받지 않는다", () => {
    const one = [tori(), speech(), tori(), quiet(), tori()];
    const two = [...one, quiet(), tori()];
    expect(
      chatQuietAcceptsOf({ rows: one, choice: null, settings: CHAT }),
    ).toBe(true);
    expect(
      chatQuietAcceptsOf({ rows: two, choice: null, settings: CHAT }),
    ).toBe(false);
  });

  it("AC-27f 서버는 talk.chat_quiet_seconds 가 0 이거나 고르기 차례(두 단추)이면 quiet 를 받지 않는다", () => {
    const rows = [tori(), speech(), tori()];
    expect(
      chatQuietAcceptsOf({
        rows,
        choice: null,
        settings: { ...CHAT, quietSeconds: 0 },
      }),
    ).toBe(false);
    expect(
      chatQuietAcceptsOf({ rows, choice: "closing", settings: CHAT }),
    ).toBe(false);
    expect(
      chatQuietAcceptsOf({ rows, choice: "suggestion", settings: CHAT }),
    ).toBe(false);
  });
});

// ── 앱이 아는 막힘 ─────────────────────────────────────────────────

describe("앱이 아는 막힘(spec 설계 7 (마) — '잘 모르겠어요' 단추 · C36 막힘 말)", () => {
  it("AC-27h '잘 모르겠어요' 단추와 모름 · 못 알아들음 말은 막힘이다", () => {
    expect(chatAppStuckOf({ kind: "dont_know" })).toBe(true);
    expect(chatAppStuckOf({ kind: "speech", heard: "I don't know." })).toBe(
      true,
    );
    expect(chatAppStuckOf({ kind: "speech", heard: "What?" })).toBe(true);
  });

  it("AC-27h 앱이 글로 알 수 없는 말 · 누른 뒤 말 없음 · 조용함 · 입구는 막힘이 아니다", () => {
    expect(chatAppStuckOf({ kind: "speech", heard: "Blue car." })).toBe(false);
    expect(chatAppStuckOf({ kind: "speech", heard: "Tomorrow" })).toBe(false);
    expect(chatAppStuckOf({ kind: "not_heard" })).toBe(false);
    expect(chatAppStuckOf({ kind: "quiet" })).toBe(false);
    expect(chatAppStuckOf({ kind: "more" })).toBe(false);
    expect(chatAppStuckOf({ kind: "back" })).toBe(false);
  });

  it("AC-27h 흐름 꼴 아이 칸: 말 · 막힘 말 · 단추 · 들리지 않음, quiet 와 입구는 흐름 행이 없다", () => {
    expect(chatChildFlowOf(SAY)).toEqual({
      input: "speech",
      stuck: false,
      nospeech: false,
    });
    expect(chatChildFlowOf({ kind: "speech", heard: "I don't know" })).toEqual({
      input: "speech",
      stuck: true,
      nospeech: false,
    });
    expect(chatChildFlowOf({ kind: "dont_know" })).toEqual({
      input: "dont_know",
      stuck: false,
      nospeech: false,
    });
    expect(chatChildFlowOf({ kind: "not_heard" })).toEqual({
      input: "dont_know",
      stuck: false,
      nospeech: true,
    });
    expect(chatChildFlowOf({ kind: "quiet" })).toBeNull();
    expect(chatChildFlowOf({ kind: "more" })).toBeNull();
    expect(chatChildFlowOf({ kind: "back" })).toBeNull();
  });

  it("AC-27h 막힘 말은 참고 턴에 들지 않는다(앱이 아는 막힘으로 계산)", () => {
    const base = [
      tori("Hi!"),
      speech("Hello.", { segment: "greeting" }),
      tori("Nice."),
      speech("Good.", { segment: "greeting" }),
      tori("What do you like?"),
    ];
    const flow = chatChildFlowOf({ kind: "speech", heard: "I don't know" });
    const turns = [...flowOf(base), said({ ...flow })];
    expect(positionOf(turns).talkCount).toBe(2);
  });
});

// ── 받침 단계(검토 I-1) ───────────────────────────────────────────

describe("받침 단계(이야기 방식 선생님 행 move.stage — 지금 셈이 기존 받침 행과 같은 규칙으로 돈다)", () => {
  it("AC-27f quiet 를 섞어도 마지막 인사 자리의 talk.dontknow_max 번째 모름 단추에서 인사가 끝난다", () => {
    // 첫 인사에 말로 답함 → 마지막 인사 자리에서 모름 단추 셋, 사이사이 quiet
    const sim = play([SAY, DK, QUIET, DK, QUIET, QUIET, DK], MAX3);
    expect(sim.greetingEnds).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
    // 단계: 말 0 · 막힘 1 · quiet 는 앞 받침 단계를 잇고 · 막힘 2 · … · 인사 끝 막힘은 닫기
    expect(sim.stages).toEqual([
      0,
      TALK_SUPPORT_STAGE_TOGETHER,
      TALK_SUPPORT_STAGE_TOGETHER,
      TALK_SUPPORT_STAGE_EASY,
      TALK_SUPPORT_STAGE_EASY,
      TALK_SUPPORT_STAGE_EASY,
      TALK_SUPPORT_STAGE_MAX,
    ]);
    // 기존 방식의 받침 행 꼴(quiet 없음, 단계를 손으로 적음)과 위치가 같다
    const app = [
      toriStage("Hi! How are you?", 0),
      speech("Good.", { segment: "greeting" }),
      toriStage("Can you tell me more?", 0),
      dontKnow({ segment: "greeting" }),
      toriStage("Can you tell me more?", TALK_SUPPORT_STAGE_TOGETHER),
      dontKnow({ segment: "greeting" }),
      toriStage("Can you tell me more?", TALK_SUPPORT_STAGE_EASY),
      dontKnow({ segment: "greeting" }),
      toriStage("Can you tell me more?", TALK_SUPPORT_STAGE_MAX),
      toriStage("We are back! What do you like?", 0),
    ];
    const pick = (p: ReturnType<typeof positionOf>) => ({
      phase: p.phase,
      greetingIndex: p.greetingIndex,
      stuckInSlot: p.stuckInSlot,
      streak: p.streak,
      talkCount: p.talkCount,
    });
    expect(pick(positionOf(flowOf(sim.rows), { settings: MAX3 }))).toEqual(
      pick(positionOf(flowOf(app), { settings: MAX3 })),
    );
  });

  it("AC-27f 받침 단계 없이(모두 0) 같은 수업을 되짚으면 인사가 끝나지 않는다(고친 까닭)", () => {
    const rows: Row[] = [toriStage("Hi! How are you?", 0)];
    rows.push(speech("Good.", { segment: "greeting" }), toriStage("Ok?", 0));
    for (let i = 0; i < MAX3.dontknowMax; i += 1)
      rows.push(dontKnow({ segment: "greeting" }), toriStage("Ok?", 0));
    const pos = positionOf(flowOf(rows), {
      segment: "greeting",
      settings: MAX3,
    });
    expect(pos.phase).toBe("greeting");
  });

  it("AC-27f 이어진 둘째 막힘 뒤 끝 줄 위치의 자리 막힘 수가 2 이상이다", () => {
    for (const second of [
      DK,
      { kind: "speech", heard: "I don't know." } as const,
    ]) {
      // 인사 둘을 말로 끝낸 뒤 대화 토막에서 막힘 → quiet → 막힘
      const sim = play([SAY, SAY, DK, QUIET, second], MAX3);
      expect(sim.seg).toBe("talk");
      const atEnd = sim.afters.at(-1);
      expect(atEnd?.stuckInSlot).toBeGreaterThanOrEqual(2);
      // 받침 단계를 적은 선생님 행 뒤에도 자리 막힘 수는 그대로다(자리를 잇는다)
      expect(
        positionOf(flowOf(sim.rows), { settings: MAX3 }).stuckInSlot,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("AC-27f 인사 중 모름 단추 셋 뒤에 두 번 말한 아이는 참여가 거의 없음으로 갈리지 않는다", () => {
    const sim = play([DK, DK, DK, SAY, SAY], MAX3);
    expect(sim.greetingEnds).toEqual([false, false, false, true, false]);
    expect(talkNearlySilent(flowOf(sim.rows))).toBe(false);
    // 받침 단계 없이 적은 같은 행은 다섯 아이 행이 모두 인사 토막이라 참여가 거의 없음으로 갈렸다
    const flat: Row[] = [toriStage("Hi! How are you?", 0)];
    for (let i = 0; i < 3; i += 1)
      flat.push(dontKnow({ segment: "greeting" }), toriStage("Ok?", 0));
    flat.push(speech("A.", { segment: "greeting" }), toriStage("Ok?", 0));
    flat.push(speech("B.", { segment: "greeting" }), toriStage("Ok?", 0));
    expect(talkNearlySilent(flowOf(flat))).toBe(true);
  });

  it("AC-27f 받침 단계의 갈래: 막힘 아님 0 · 막힘 1 · 2 · talk.dontknow_max 번째와 인사 끝 막힘은 닫기 · quiet 는 앞 받침을 잇고 · 입구와 들리지 않음은 0", () => {
    const at = (stuckInSlot: number, greetingEndNow = false) => ({
      stuckInSlot,
      greetingEndNow,
    });
    const stage = (input: ChatInput, positionAfter = at(0), prevStage = 0) =>
      chatSupportStageOf({ input, positionAfter, prevStage, settings: MAX3 });
    expect(stage(SAY)).toBe(0);
    expect(stage(DK, at(1))).toBe(TALK_SUPPORT_STAGE_TOGETHER);
    expect(stage({ kind: "speech", heard: "What?" }, at(2))).toBe(
      TALK_SUPPORT_STAGE_EASY,
    );
    expect(stage(DK, at(3))).toBe(TALK_SUPPORT_STAGE_MAX);
    expect(stage(DK, at(5))).toBe(TALK_SUPPORT_STAGE_MAX);
    // 인사 끝 차례의 막힘(막힘 말로 인사가 끝남)은 몇 번째든 닫기(지금 greetingEndPlan)
    expect(stage({ kind: "speech", heard: "I don't know" }, at(1, true))).toBe(
      TALK_SUPPORT_STAGE_MAX,
    );
    // quiet: 앞 선생님 행이 받침(1 · 2)이면 그 단계를 이어 자리를 끊지 않고, 아니면 0
    expect(stage(QUIET, at(1), TALK_SUPPORT_STAGE_TOGETHER)).toBe(
      TALK_SUPPORT_STAGE_TOGETHER,
    );
    expect(stage(QUIET, at(2), TALK_SUPPORT_STAGE_EASY)).toBe(
      TALK_SUPPORT_STAGE_EASY,
    );
    expect(stage(QUIET, at(0), 0)).toBe(0);
    expect(stage(QUIET, at(3), TALK_SUPPORT_STAGE_MAX)).toBe(0);
    // 들리지 않음(기기 쪽 — 지금 규칙도 자리를 닫음) · 입구는 0
    expect(
      stage({ kind: "not_heard" }, at(1), TALK_SUPPORT_STAGE_TOGETHER),
    ).toBe(0);
    for (const input of [{ kind: "more" }, { kind: "back" }] as const)
      expect(stage(input, at(1), TALK_SUPPORT_STAGE_TOGETHER)).toBe(0);
  });
});

// ── 질문 자리가 없을 때의 막힘 수(fix 2 — lesson-flow 의 이야기 방식 행 갈래) ──────────

describe("질문 자리가 없을 때의 막힘 수(이야기 방식 행만 — 선생님 말에 물음이 없어도 받침 행이 막힘 수를 잇는다)", () => {
  /** 마지막 인사 선생님 말에 물음이 없는 수업: 첫 인사에 말로 답한 뒤 모름 단추 셋, 사이사이 quiet. */
  const GREET = [SAY, DK, QUIET, DK, QUIET, DK] as const;
  /** 인사 둘을 말로 끝낸 뒤 대화 토막에서 물음 없는 말 뒤 막힘 → quiet → 막힘. */
  const TALK = [SAY, SAY, DK, QUIET, DK] as const;
  const STATEMENT = "I like Sunday.";

  it("AC-27f 마지막 인사 선생님 말에 물음이 없어도 quiet 를 섞어도 talk.dontknow_max 번째 모름 단추에서 인사가 끝난다", () => {
    const sim = play(GREET, MAX3, { text: STATEMENT });
    expect(sim.greetingEnds).toEqual([false, false, false, false, false, true]);
    expect(sim.afters.map((p) => p.stuckInSlot)).toEqual([0, 1, 1, 2, 2, 3]);
    expect(positionOf(flowOf(sim.rows), { settings: MAX3 }).phase).toBe("talk");
  });

  it("AC-27f 대화 토막에서 물음 없는 말 뒤에 막힘이 잇달아 둘이면 끝 줄 위치의 자리 막힘 수가 2 이상이다", () => {
    const sim = play(TALK, MAX3, { text: "I like parks." });
    expect(sim.seg).toBe("talk");
    expect(sim.afters.at(-1)?.stuckInSlot).toBeGreaterThanOrEqual(2);
    expect(
      positionOf(flowOf(sim.rows), { settings: MAX3 }).stuckInSlot,
    ).toBeGreaterThanOrEqual(2);
  });

  it("AC-27f 같은 차례를 chat 묶음 없는 행으로 넣으면 고치기 전과 같은 값이 나온다(기존 방식 행은 그대로)", () => {
    // 고치기 전 코드(lesson-flow 434줄 'm && isSupportMove(m) && slot')로 한 번 뜬 값
    const greet = play(GREET, MAX3, { text: STATEMENT, chat: false });
    expect(greet.greetingEnds).toEqual(BEFORE_FIX.greet.greetingEnds);
    expect(greet.afters.map((p) => p.stuckInSlot)).toEqual(
      BEFORE_FIX.greet.stuckInSlot,
    );
    expect(positionOf(flowOf(greet.rows), { settings: MAX3 }).phase).toBe(
      BEFORE_FIX.greet.phase,
    );
    const talk = play(TALK, MAX3, { text: "I like parks.", chat: false });
    expect(talk.afters.map((p) => p.stuckInSlot)).toEqual(
      BEFORE_FIX.talk.stuckInSlot,
    );
  });

  it("AC-27f 질문 자리가 있을 때는 chat 묶음이 있든 없든 같은 값이다", () => {
    const withChat = play(GREET, MAX3);
    const without = play(GREET, MAX3, { chat: false });
    expect(withChat.greetingEnds).toEqual(without.greetingEnds);
    expect(withChat.afters.map((p) => p.stuckInSlot)).toEqual(
      without.afters.map((p) => p.stuckInSlot),
    );
  });
});

// ── 사실 줄 고르기 · 마무리 차례 · 인사 끝 ────────────────────────────

describe("사실 줄 고르기(spec 설계 3 '사실 줄은 네 때뿐이다')", () => {
  it("AC-27c 인사 끝 사실 줄은 인사 끝 차례이고 짧은 준비가 열릴 때만 붙는다", () => {
    const facts = (greetingEnd: boolean, prepOpens: boolean) =>
      chatFactsOf({ greetingEnd, prepOpens, closing: false, lastTurn: false });
    expect(facts(true, true)).toEqual([{ kind: "prep_next" }]);
    expect(facts(true, false)).toEqual([]);
    expect(facts(false, true)).toEqual([]);
  });

  it("AC-27j 마무리 차례에는 마무리 사실 줄이 붙는다", () => {
    expect(
      chatFactsOf({
        greetingEnd: false,
        prepOpens: true,
        closing: true,
        lastTurn: false,
      }),
    ).toEqual([{ kind: "closing" }]);
  });

  it("AC-27k 안전 상한 차례에는 안전 상한 사실 줄만 붙고, 앱이 하지 않을 일(두 단추 · 짧은 준비)의 사실 줄은 붙지 않는다", () => {
    expect(
      chatFactsOf({
        greetingEnd: true,
        prepOpens: true,
        closing: true,
        lastTurn: true,
      }),
    ).toEqual([{ kind: "last_turn" }]);
  });

  it("AC-27c 한국어 도움 사실 줄은 도움이 있을 때만 붙는다(한국어 가지가 합쳐진 뒤 켬)", () => {
    expect(
      chatFactsOf({
        greetingEnd: false,
        prepOpens: false,
        closing: false,
        lastTurn: false,
        koHelp: { taught: "I like it." },
      }),
    ).toEqual([{ kind: "ko_help", taught: "I like it." }]);
    expect(
      chatFactsOf({
        greetingEnd: false,
        prepOpens: false,
        closing: false,
        lastTurn: false,
        koHelp: null,
      }),
    ).toEqual([]);
  });

  it("AC-27c 사실 줄이 없는 차례는 빈 목록이다(보통 차례 · quiet 차례)", () => {
    expect(
      chatFactsOf({
        greetingEnd: false,
        prepOpens: true,
        closing: false,
        lastTurn: false,
      }),
    ).toEqual([]);
  });

  it("AC-27c 인사 끝 차례: 마지막 인사 자리의 말 · 들리지 않음은 인사를 끝내고, quiet · 입구는 끝내지 않는다", () => {
    // 인사 둘 가운데 첫째를 말로 답한 뒤 → 지금 마지막 인사 질문 자리
    const before = positionOf(
      flowOf([
        tori("Hi! How are you?"),
        speech("Good.", { segment: "greeting" }),
        tori("Do you like Sunday?"),
      ]),
      { segment: "greeting" },
    );
    expect(before.lastGreetingQuestion).toBe(true);
    const ends = (input: ChatInput) =>
      chatGreetingEndOf({ input, position: before, settings: LOW });
    expect(ends(SAY)).toBe(true);
    expect(ends({ kind: "not_heard" })).toBe(true);
    expect(ends({ kind: "quiet" })).toBe(false);
    expect(ends({ kind: "more" })).toBe(false);
    // 모름 단추는 talk.dontknow_max 번째에서만 끝낸다(지금 규칙 그대로) — 첫째부터 talk.dontknow_max 번째까지 눌러 본다
    const presses = play(
      [SAY, ...Array.from({ length: MAX3.dontknowMax }, () => DK)],
      MAX3,
    );
    expect(presses.greetingEnds.slice(1)).toEqual([false, false, true]);
  });

  it("AC-27c 인사 첫째 자리의 말은 인사 끝이 아니다", () => {
    const first = positionOf(flowOf([tori("Hi! How are you?")]), {
      segment: "greeting",
    });
    expect(
      chatGreetingEndOf({ input: SAY, position: first, settings: LOW }),
    ).toBe(false);
  });

  it("AC-27j 마무리 차례는 말로 답한 차례가 참고 턴에 닿을 때이고, quiet · 모름 · 입구는 위치를 읽지 않는다", () => {
    let called = 0;
    const reached = () => {
      called += 1;
      return { reachedNow: true, roundEndedNow: false };
    };
    expect(chatClosingTurnOf({ input: SAY, positionAfter: reached })).toBe(
      true,
    );
    expect(called).toBe(1);
    for (const input of [
      { kind: "quiet" },
      { kind: "dont_know" },
      { kind: "not_heard" },
      { kind: "more" },
      { kind: "back" },
    ] as const)
      expect(chatClosingTurnOf({ input, positionAfter: reached })).toBe(false);
    expect(called).toBe(1);
    expect(
      chatClosingTurnOf({
        input: SAY,
        positionAfter: () => ({ reachedNow: false, roundEndedNow: true }),
      }),
    ).toBe(true);
    expect(
      chatClosingTurnOf({
        input: SAY,
        positionAfter: () => ({ reachedNow: false, roundEndedNow: false }),
      }),
    ).toBe(false);
  });

  it("AC-27j 참고 턴에 닿는 말 차례는 위치 되짚기로 마무리 차례가 되고 quiet 행은 그 셈을 앞당기지 않는다", () => {
    const spec = { ...SPEC3, targetTurns: 3 };
    const head = [
      tori("Hi!"),
      speech("Hello.", { segment: "greeting" }),
      tori("Nice."),
      speech("Good.", { segment: "greeting" }),
      tori("What do you like?"),
      quiet(),
      tori("Soccer? Parks?"),
      quiet(),
      tori("I like parks."),
    ];
    const positionAfterOf = (rows: readonly Row[], input: ChatInput) => () => {
      const flow = chatChildFlowOf(input);
      const turns = [...flowOf(rows), ...(flow ? [said(flow)] : [])];
      return talkLessonPositionOf({
        spec,
        card: CARD3,
        newWords: NEW3,
        turns,
        segment: "talk",
        settings: LOW,
        prepWords: CARD3.prep ?? [],
      });
    };
    // quiet 두 번 뒤의 첫 말이 셋째 말 차례 → 마무리 차례
    expect(
      chatClosingTurnOf({
        input: SAY,
        positionAfter: positionAfterOf(head, SAY),
      }),
    ).toBe(true);
    // quiet 차례 자체는 마무리 차례가 아니다
    const q: ChatInput = { kind: "quiet" };
    expect(
      chatClosingTurnOf({ input: q, positionAfter: positionAfterOf(head, q) }),
    ).toBe(false);
  });
});

// ── 차례 끝(마무리 차례 · 마무리 제안 · 안전 상한) ─────────────────────

describe("차례 끝(spec 설계 9 · 10)", () => {
  it("AC-27j 마무리 차례는 closing, 선생님이 맺으면(wrap_up) suggestion, 둘이 함께면 closing", () => {
    expect(
      chatTurnEndOf({ closing: true, lastTurn: false, wrapUp: false }),
    ).toBe("closing");
    expect(
      chatTurnEndOf({ closing: false, lastTurn: false, wrapUp: true }),
    ).toBe("suggestion");
    expect(
      chatTurnEndOf({ closing: true, lastTurn: false, wrapUp: true }),
    ).toBe("closing");
    expect(
      chatTurnEndOf({ closing: false, lastTurn: false, wrapUp: false }),
    ).toBeNull();
  });

  it("AC-27k 안전 상한 차례는 마무리 차례 · wrap_up 보다 앞선다", () => {
    expect(chatTurnEndOf({ closing: true, lastTurn: true, wrapUp: true })).toBe(
      "last_turn",
    );
  });
});

// ── 끝 줄 신호 ────────────────────────────────────────────────────

describe("끝 줄 신호(spec 설계 6 · 7 · 11)", () => {
  const signal = (over: Partial<Parameters<typeof chatEndSignalOf>[0]> = {}) =>
    chatEndSignalOf({
      end: null,
      run: 0,
      aiResting: false,
      prepNext: false,
      input: SAY,
      settings: CHAT,
      ...over,
    });

  it("AC-27f 보통 차례: 기다림 시간 · 힌트 단추 · 후보 수가 실리고 설명 기다림은 없다", () => {
    expect(signal()).toEqual({ quietSeconds: 8, hint: true, alternatives: 2 });
  });

  it("AC-27f 잇달아 말한 수가 상한이면 기다림 시간 없음", () => {
    expect(signal({ run: 1 }).quietSeconds).toBe(8);
    const capped = signal({ run: 2, input: { kind: "quiet" } });
    expect(capped.quietSeconds).toBeUndefined();
    expect("quietSeconds" in capped).toBe(false);
    // 아이는 여전히 말할 수 있다 — 힌트 단추 · 후보 수는 그대로
    expect(capped).toEqual({ hint: true, alternatives: 2 });
  });

  it("AC-27f talk.chat_quiet_seconds 가 0 이면 기다림 시간을 싣지 않는다(끄는 길)", () => {
    const off = signal({ settings: { ...CHAT, quietSeconds: 0 } });
    expect("quietSeconds" in off).toBe(false);
    expect(off).toEqual({ hint: true, alternatives: 2 });
  });

  it("AC-27f 'AI 쉬는 중'이면 기다림 시간을 싣지 않는다", () => {
    expect("quietSeconds" in signal({ aiResting: true })).toBe(false);
  });

  it("AC-27j 마무리 차례 · 마무리 제안 · 안전 상한 차례에는 기다림 시간 · 힌트 단추 · 후보 수를 싣지 않는다", () => {
    for (const end of ["closing", "suggestion", "last_turn"] as const)
      expect(signal({ end })).toEqual({});
  });

  it("AC-27f 앞 아이 차례가 앱이 아는 막힘이면 설명 기다림 표지가 실린다", () => {
    expect(signal({ input: { kind: "dont_know" } })).toEqual({
      quietSeconds: 8,
      hint: true,
      explainWait: 6,
      alternatives: 2,
    });
    expect(
      signal({ input: { kind: "speech", heard: "I don't know" } }).explainWait,
    ).toBe(6);
    // 들리지 않음 · 조용함 · 입구 뒤에는 없다
    for (const input of [
      { kind: "not_heard" },
      { kind: "quiet" },
      { kind: "more" },
      { kind: "back" },
    ] as const)
      expect("explainWait" in signal({ input })).toBe(false);
  });

  it("AC-27f 막힘 뒤 마무리 차례에도 설명 기다림 표지는 막힘을 따른다(설계 7 은 차례 종류로 빼지 않음)", () => {
    expect(signal({ end: "closing", input: { kind: "dont_know" } })).toEqual({
      explainWait: 6,
    });
    expect(signal({ end: "suggestion", input: { kind: "dont_know" } })).toEqual(
      { explainWait: 6 },
    );
  });

  it("AC-27f 설명 기다림은 talk.chat_explain_wait_seconds 값(초)을 싣고, 0 이어도 칸은 있다(설명은 청하고 타이머만 기다리지 않음)", () => {
    const zero = signal({
      input: { kind: "dont_know" },
      settings: { ...CHAT, explainWaitSeconds: 0 },
    });
    expect("explainWait" in zero).toBe(true);
    expect(zero.explainWait).toBe(0);
  });

  it("AC-27f 막힘 뒤 안전 상한 차례에는 설명 기다림을 싣지 않는다(설명이 보일 아이 차례가 없음)", () => {
    expect(signal({ end: "last_turn", input: { kind: "dont_know" } })).toEqual(
      {},
    );
  });

  it("AC-27f 막힘 뒤 'AI 쉬는 중'이면 설명 기다림을 싣지 않는다(설명 호출이 성공할 수 없음)", () => {
    const resting = signal({ aiResting: true, input: { kind: "dont_know" } });
    expect("explainWait" in resting).toBe(false);
    expect(resting).toEqual({ hint: true, alternatives: 2 });
  });

  it("AC-27f 다음이 짧은 준비인 차례(인사 끝)는 빈 신호다", () => {
    expect(signal({ prepNext: true })).toEqual({});
    expect(signal({ prepNext: true, input: { kind: "dont_know" } })).toEqual(
      {},
    );
  });

  it("AC-27f '더 이야기하기' 뒤 잇달아 말한 수는 마무리 제안 앞의 quiet 를 이어 센다(spec 글 그대로, 첫 판)", () => {
    // 말 → 선생님 → quiet → 선생님(wrap_up, 마무리 제안) → '더 이야기하기'(입구, 아이 행 없음) → 선생님
    const rows = [tori(), speech(), tori(), quiet(), tori(), tori()];
    expect(chatTeacherRunOf(rows)).toBe(1);
    // 그래서 그 뒤 조용함 차례는 한 번만 온다(run 1 → 기다림 있음, quiet 한 번 뒤 run 2 → 없음)
    expect(signal({ run: chatTeacherRunOf(rows) }).quietSeconds).toBe(8);
    expect(
      "quietSeconds" in signal({ run: chatTeacherRunOf([...rows, quiet()]) }),
    ).toBe(false);
  });

  it("AC-27l 후보 수는 talk.chat_alternatives 값을 그대로 싣는다", () => {
    expect(
      signal({ settings: { ...CHAT, alternatives: 3 } }).alternatives,
    ).toBe(3);
  });
});

// ── 평가 호출을 부를 차례 ──────────────────────────────────────────

describe("평가 호출을 부를 차례(spec 설계 8-2)", () => {
  it("AC-27h 말 입력이 있는 차례만 부를 차례이고 조용함 · 모름 단추 · 들리지 않음 · 입구는 아니다", () => {
    expect(chatEvalDueOf(SAY)).toBe(true);
    expect(chatEvalDueOf({ kind: "speech", heard: "I don't know" })).toBe(true);
    expect(chatEvalDueOf({ kind: "speech", heard: "  " })).toBe(false);
    for (const input of [
      { kind: "quiet" },
      { kind: "dont_know" },
      { kind: "not_heard" },
      { kind: "more" },
      { kind: "back" },
    ] as const)
      expect(chatEvalDueOf(input)).toBe(false);
  });

  it("AC-27h 아이 차례 n 은 그 뒤 선생님 차례 n+1 이 저장된 뒤에 부른다", () => {
    const n = speech("I like parks.");
    // n+1 이 아직 없음 → 부르지 않음
    expect(chatEvalAfterTeacherOf([tori(), n])).toBeNull();
    // n+1 뒤 → n
    expect(chatEvalAfterTeacherOf([tori(), n, tori("Parks are fun!")])).toBe(n);
  });

  it("AC-27h 선생님 차례 앞의 아이 행이 조용함 · 모름 단추 · 들리지 않음 · 빈 글이면 부르지 않는다", () => {
    for (const child of [quiet(), dontKnow(), notHeard(), speech("")])
      expect(chatEvalAfterTeacherOf([tori(), child, tori()])).toBeNull();
    // 입구로 연 선생님 차례(앞이 선생님 행)도 부르지 않는다
    expect(chatEvalAfterTeacherOf([tori(), tori()])).toBeNull();
  });

  it("AC-27h 수업을 닫을 때는 아직 기다리는 말 차례를 n+1 이 없어도 부른다", () => {
    const a = speech("A.");
    const b = speech("B.");
    const done = speech("C.");
    const rows = [tori(), a, tori(), quiet(), tori(), done, tori(), b];
    const waiting = new Set<Row>([a, b]);
    expect(chatEvalOnCloseOf(rows, (r) => waiting.has(r))).toEqual([a, b]);
  });
});

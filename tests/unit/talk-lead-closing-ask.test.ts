// 지금 새 방식(talk.lead_mode claude)의 마무리 상수 물음 거름(13절 C243 보완 10 (2) · 코드 검토 rev-chat-closing O-1). 선생님 말 칸에 마무리 물음
// ('Do you want to talk more?')이 이미 있으면 앱은 그 물음을 붙이지 않고 move.lead.closingAdded 도 적지 않는다. 거름은 core leadClosingAddsOf
// 한 곳에 있고, 서버 턴 길 lead-turn.ts 의 성공 길과 실패 갈래(첫 문장 뒤 끊김)가 그 함수를 부른다. 이 파일은 그 두 갈래를 DB 없이 돌려 본다:
// AI 호출(talkLeadTurn) · 상태 읽기 · 쓰기는 가짜로 바꾸고, 마무리 차례인지(leadClosingTurnOf)는 참으로 둔다(마무리 때 정하기는 이 묶음 밖).
// 이야기 방식(chatClosingAddsOf)은 같은 함수를 그대로 부르므로 동작이 같다.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMasker } from "@/core/ai/mask";
import { chatClosingAddsOf } from "@/core/conversation/chat-turn-result";
import { talkLessonPositionOf } from "@/core/conversation/lesson-flow";
import { talkLessonSettingsFrom } from "@/core/conversation/lesson-turns";
import { readTalkMove, talkMoveOf } from "@/core/conversation/move";
import { MORE_PROMPT } from "@/core/conversation/spoken";
import type { TalkLessonState, TalkTurnRow } from "@/server/conversation/state";
import type { Db } from "@/server/db";
import { loadScriptConfig } from "../../scripts/ai-contract";
import { materialsOf, readSeedFiles } from "../../scripts/talk-observe";
import {
  SAMPLE_CONTACT_PATTERNS,
  SAMPLE_FORBIDDEN,
  SAMPLE_NAMES,
} from "../fixtures/ai/sample-inputs";

/** 가짜 AI 호출의 결과를 정하는 자리(시험마다 바꾼다). */
type LeadCall = (ctx: {
  holdSay?: (heads: Record<string, unknown>) => boolean;
  onSentence?: (en: string) => void;
}) => unknown;
let leadCall: LeadCall = () => {
  throw new Error("가짜 호출이 정해지지 않았다");
};
/** 저장된 선생님 행(tx.insert(talkTurns).values 로 넣은 값). */
let inserted: Record<string, unknown>[] = [];
/** 잠금 읽기(첫째)는 상태를, 저장 뒤 다시 읽기는 null(끝 줄 stale)을 낸다. */
let lockedState: TalkLessonState | null = null;
let stateReads = 0;

vi.mock("@/server/ai/talk", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/ai/talk")>()),
  talkLeadTurn: async (_input: unknown, ctx: Parameters<LeadCall>[0]) =>
    leadCall(ctx),
}));
vi.mock("@/server/seed/read", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/seed/read")>()),
  readLevelSpec: async () => ({ cefr: "A1" }),
}));
vi.mock("@/server/conversation/state", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/conversation/state")>()),
  readTalkLessonState: async () => {
    stateReads += 1;
    return stateReads === 1 ? lockedState : null;
  },
  writeSay: async () => {},
}));
vi.mock("@/server/conversation/closing", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/conversation/closing")>()),
  completeTalk: async () => {},
}));
// 마무리 차례로 정해진 차례(앱이 정하는 때 — 이 묶음 밖)
vi.mock("@/core/conversation/lead-turn-core", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/core/conversation/lead-turn-core")
  >()),
  leadClosingTurnOf: () => true,
}));

const { leadTurnAfterChild } = await import("@/server/conversation/lead-turn");

const ROOT = process.cwd();
const config = loadScriptConfig({ root: ROOT });
const SESSION_ID = "00000000-0000-4000-8000-000000000002";

function materials3() {
  const m = materialsOf(readSeedFiles(ROOT, 3, 1), {
    level: 3,
    unit: 1,
    lesson: 1,
    teacher: "mina",
  });
  if (!m.ok) throw new Error(m.missing);
  return m.materials;
}
const M = materials3();

const row = (over: Partial<TalkTurnRow>): TalkTurnRow =>
  ({
    id: "00000000-0000-4000-8000-000000000011",
    sessionId: SESSION_ID,
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
    recordedAt: new Date("2026-11-14T10:00:00+09:00"),
    ...over,
  }) as TalkTurnRow;

const TEACHER_ROW = row({
  id: "00000000-0000-4000-8000-000000000011",
  turnNo: 1,
  speaker: "tori",
  text: "What do you like to play?",
  move: talkMoveOf({ kind: "first_question" }),
});
const CHILD_ROW = row({
  id: "00000000-0000-4000-8000-000000000012",
  turnNo: 1,
  speaker: "child",
  text: "I like soccer.",
  inputMode: "speech",
});

/** 3단계 단원 1 의 지금 새 방식 수업 상태(턴 길이 읽는 칸만 — 재료는 시드). */
function stateOf(): TalkLessonState {
  const settings = talkLessonSettingsFrom((key) => config.values[key], "1-3");
  const base = {
    spec: M.spec,
    card: M.card,
    lesson: { newWords: M.newWords },
    turns: [],
    segment: "talk" as const,
    settings,
    start: {
      metBefore: [],
      prepPlan: [],
      carry: { goals: [], words: [] },
      leadMode: "claude" as const,
    },
    prepWords: [],
  };
  const position = talkLessonPositionOf({
    spec: base.spec,
    card: base.card,
    newWords: M.newWords,
    turns: [],
    segment: "talk",
    settings,
    carry: base.start.carry,
    prepWords: [],
  });
  return {
    ...base,
    profileId: "profile-1",
    session: {
      id: SESSION_ID,
      level: 3,
      unit: 1,
      status: "in_progress",
      talkSegment: "talk",
      seedRevision: 1,
    },
    lessonRow: { revision: 1 },
    level: 3,
    unit: 1,
    nospeechDontknowCount: 2,
    teacher: null,
    rows: [TEACHER_ROW, CHILD_ROW],
    liveRows: [TEACHER_ROW, CHILD_ROW],
    orphan: null,
    follows: {},
    position,
    lemmaOf: M.lemmaOf,
    lemmaEntries: [],
    snapshot: { "talk.known_days": config.values["talk.known_days"] },
    learningDay: "2026-11-14",
    timezone: "Asia/Seoul",
    dayStartHour: 4,
  } as unknown as TalkLessonState;
}

/** 거래 안의 쓰기를 받는 가짜 DB(선생님 행 넣기만 모은다). 그 밖의 읽기는 던져 턴 길이 '읽지 못함'으로 넘어간다. */
function fakeDb(): Db {
  const tx = {
    insert: () => ({
      values: async (v: Record<string, unknown>) => {
        inserted.push(v);
      },
    }),
    update: () => ({ set: () => ({ where: async () => {} }) }),
  };
  const db = {
    transaction: async (fn: (t: unknown) => Promise<unknown>) => fn(tx),
    select: () => {
      throw new Error("시험 DB 는 읽지 않는다");
    },
  };
  return db as unknown as Db;
}

const masker = createMasker({
  names: SAMPLE_NAMES,
  isVocabWord: () => false,
  contactPatterns: SAMPLE_CONTACT_PATTERNS,
});

/** 아이 차례 뒤 선생님 차례 하나를 돌려 흘린 줄과 저장한 선생님 행을 돌려준다. */
async function runTurn(): Promise<{
  lines: Record<string, unknown>[];
  teacher: Record<string, unknown> | undefined;
}> {
  const lines: Record<string, unknown>[] = [];
  const state = stateOf();
  lockedState = state;
  const db = fakeDb();
  const now = () => new Date("2026-11-14T10:00:05+09:00");
  await leadTurnAfterChild(
    state,
    CHILD_ROW,
    {
      db,
      now,
      write: (line) => lines.push(line as Record<string, unknown>),
      homophones: () => [],
      talkLists: () => M.talkLists as never,
      ai: {
        lists: () => ({ forbidden: SAMPLE_FORBIDDEN }) as never,
        metaPhrases: () => M.metaPhrases,
      } as never,
    },
    {
      db,
      profileId: "profile-1",
      masker,
      settings: config.values,
      at: now(),
      received: now(),
      restingP: Promise.resolve(false),
      timer: { mark: () => {}, result: () => ({}) as never },
    },
    Promise.resolve(M.ctx),
  );
  return {
    lines,
    teacher: inserted.find((v) => v.speaker === "tori"),
  };
}

const ASKED = ["Great job!", "Do you want to talk more?"];
const NOT_ASKED = ["Great job!", "You did well today."];

function okCall(sentences: readonly string[]): LeadCall {
  return ({ holdSay, onSentence }) => {
    holdSay?.({ reading: "clear_answer", move: "react_and_follow_up" });
    for (const en of sentences) onSentence?.(en);
    return {
      ok: true,
      value: {
        reading: "clear_answer",
        move: "react_and_follow_up",
        say: sentences.join(" "),
        say_ko: "",
        model_sentence: "",
        hint_ko: "",
        hint_en: "",
        goal_words_i_said: [],
        child_used_on_own: [],
      },
      sentSentences: [...sentences],
      blocked: [],
      overLength: 0,
      firstSentenceMs: 300,
      answeredModel: "claude-sonnet-5-5",
      normalized: false,
      checked: false,
      hintsBlocked: false,
      farewellBlocked: false,
      summaryBlocked: false,
      streamed: true,
    };
  };
}

function cutCall(sentences: readonly string[]): LeadCall {
  return ({ onSentence }) => {
    for (const en of sentences) onSentence?.(en);
    return {
      ok: false,
      reason: "cut_after_first",
      sentSentences: [...sentences],
      overLength: 0,
      firstSentenceMs: 300,
      cause: "timeout",
    };
  };
}

const addLines = (lines: readonly Record<string, unknown>[]) =>
  lines.filter((l) => l.t === "add" && l.kind === "more_prompt");

beforeEach(() => {
  // 가짜 DB 가 읽기를 던져 턴 길이 남기는 '읽지 못함' 알림(오류 이름만)은 시험 출력에서 뺀다
  vi.spyOn(console, "error").mockImplementation(() => {});
  inserted = [];
  stateReads = 0;
  lockedState = null;
});

describe("지금 새 방식 마무리 상수 물음 거름(13절 C243 보완 10 (2) · O-1)", () => {
  it("AC-26c core leadClosingAddsOf: 말 칸에 마무리 물음이 이미 있으면 붙이지 않는다 — 이야기 방식 chatClosingAddsOf 와 같은 값", async () => {
    const { leadClosingAddsOf } = await vi.importActual<
      typeof import("@/core/conversation/lead-turn-core")
    >("@/core/conversation/lead-turn-core");
    const says = [
      "Great job! Do you want to talk more?",
      "do you want to talk more",
      "Great talk today!",
      "You did great! Shall we talk a little more?",
      "",
    ];
    expect(
      says.map((say) => leadClosingAddsOf({ closing: true, say })),
    ).toEqual([false, false, true, false, true]);
    for (const say of says) {
      expect(chatClosingAddsOf({ closing: true, say })).toBe(
        leadClosingAddsOf({ closing: true, say }),
      );
      expect(leadClosingAddsOf({ closing: false, say })).toBe(false);
    }
  });

  it("AC-26c 서버 턴 길 성공 길: 'Great job! Do you want to talk more?' 이면 앱 물음 줄이 없고 행 글에 두 번 들지 않으며 move.lead.closingAdded 가 없다", async () => {
    leadCall = okCall(ASKED);
    const { lines, teacher } = await runTurn();
    expect(addLines(lines)).toEqual([]);
    expect(teacher?.text).toBe(ASKED.join(" "));
    const move = readTalkMove(teacher?.move);
    expect(move?.lead).toBeDefined();
    expect(move?.lead?.closingAdded).toBeUndefined();
  });

  it("AC-26c 서버 턴 길 성공 길: 물음 없는 마무리 말이면 지금처럼 앱이 물음을 붙이고 closingAdded 를 적는다", async () => {
    leadCall = okCall(NOT_ASKED);
    const { lines, teacher } = await runTurn();
    expect(addLines(lines)).toEqual([
      expect.objectContaining({ en: MORE_PROMPT.en }),
    ]);
    expect(teacher?.text).toBe(`${NOT_ASKED.join(" ")}\n${MORE_PROMPT.en}`);
    expect(readTalkMove(teacher?.move)?.lead?.closingAdded).toBe(true);
  });

  it("AC-26c 서버 턴 길 실패 갈래(첫 문장 뒤 끊김): 보낸 문장에 마무리 물음이 있으면 앱 물음 줄이 없고 행 글에 두 번 들지 않는다", async () => {
    leadCall = cutCall(ASKED);
    const { lines, teacher } = await runTurn();
    expect(addLines(lines)).toEqual([]);
    expect(teacher?.text).toBe(ASKED.join(" "));
    expect(readTalkMove(teacher?.move)?.kind).toBe("closing_slot");
  });

  it("AC-26c 서버 턴 길 실패 갈래(첫 문장 뒤 끊김): 물음 없는 문장이면 지금처럼 앱이 물음을 붙인다", async () => {
    leadCall = cutCall(NOT_ASKED);
    const { lines, teacher } = await runTurn();
    expect(addLines(lines)).toHaveLength(1);
    expect(teacher?.text).toBe(`${NOT_ASKED.join(" ")}\n${MORE_PROMPT.en}`);
  });
});

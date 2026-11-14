// 회화 이야기 방식의 비교 도구(intent 2026-11-13-회화-대화-구조-R spec 설계 13 '비교 도구' · '일치 비율' · '직접 대조', plan 묶음 T3 · AC-9 · AC-20).
// 도구의 DB 없는 몫을 본다: 수업 행 → 다시 센 판정 · 수업별 표 · 일치 비율 두 값 · 분모 밖 수와 까닭 · 한쪽만의 낱말 무리 · 사람 판독 칸, 실제 · 모의
// 합계, 대조 갈래(지금 새 방식 기록에 평가 호출을 돌려 공식 판정과 맞댐 — 가짜 호출로만)의 평가 입력 · 표 · 기록을 고치지 않음, 출력 자리 막기.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  TalkChatEvalInput,
  TalkChatEvalOutput,
} from "@/core/ai/calls/talk-chat-eval";
import { priceBookOf, priceRowsOfSeed } from "@/core/ai/cost";
import {
  type ChatEvalFailure,
  type ChatEvalState,
  type ChatJudgeContext,
  type ChatJudgeRow,
  chatJudgesOf,
} from "@/core/conversation/chat-judge";
import { talkMoveOf } from "@/core/conversation/move";
import { HomophonesFileSchema } from "@/core/seed/schema/reference";
import { lemmaLookup } from "@/core/session/attempt";
import type { ChatTurnRowLike } from "@/server/conversation/chat-hint";
import {
  type CompareLesson,
  callLimitProblemOf,
  chatCompareMarkdownOf,
  chatCompareReportOf,
  chatLessonTableOf,
  type LeadEvalResult,
  type LeadRowLike,
  leadAgainstMarkdownOf,
  leadAgainstReportOf,
  leadAgainstTableOf,
  leadEvalEstimateOf,
  leadEvalPlanOf,
  leadLessonOfRows,
  leadLessonOfRun,
  outPathProblemOf,
  parseCompareArgs,
} from "../../scripts/talk-chat-compare";

const HOMOPHONES = HomophonesFileSchema.parse(
  JSON.parse(
    readFileSync(join(process.cwd(), "seed/lists/homophones.json"), "utf8"),
  ),
).groups;
const VOCAB = [
  { word: "go", forms: ["goes", "went", "gone", "going"] },
  { word: "see", forms: ["sees", "saw", "seen", "seeing"] },
  { word: "sea", forms: ["seas"] },
  { word: "beach", forms: ["beaches"] },
  { word: "mountain", forms: ["mountains"] },
  { word: "drink", forms: ["drinks", "drank", "drinking"] },
  { word: "water", forms: [] },
  { word: "swim", forms: ["swims", "swam", "swimming"] },
];
const CTX: ChatJudgeContext = {
  unitWords: VOCAB.map((v) => v.word),
  lemmaOf: lemmaLookup(VOCAB),
  homophones: HOMOPHONES,
  sceneWords: new Set(["beach", "sea", "mountain", "weekend"]),
  spec: { band: "1-3" },
  teacherName: "Mina",
};

const OUT: TalkChatEvalOutput = {
  reading: "clear_answer",
  teacher_move: "react_and_follow_up",
  model_sentence: "",
  child_used_on_own: [],
};

// ── 합성 이야기 방식 수업 ────────────────────────────────────────────

type Step =
  | {
      teacher: string;
      /** 1~3단계 소리 줄로 글에서 뺀 문장(move.chat.removed). 빈 목록이면 원문이 지워진 행의 꼴이다. */
      removed?: string[];
    }
  | {
      child: string;
      input?: "speech" | "dont_know" | "quiet";
      used?: string[];
      failed?: ChatEvalFailure;
      /** 말 입력인데 부르지 않음으로 저장된 행(부르는 쪽의 어긋남). */
      notCalled?: true;
    };

/**
 * 이야기 방식 수업 행(talk_turns 꼴): 선생님 행 n 뒤 아이 행 n. 아이 행의 chat_judge 는 같은 차례 · 같은 평가 출력으로 판정 함수를 돌린 값을 저장해
 * 둔다(서버가 쓴 값과 같음). 도구는 이 저장값의 평가 출력만 믿고 판정을 다시 센다.
 */
function chatRows(steps: readonly Step[]): ChatTurnRowLike[] {
  const judgeRows: ChatJudgeRow[] = [];
  for (const step of steps) {
    if ("teacher" in step) {
      judgeRows.push({
        role: "teacher",
        say: [step.teacher, ...(step.removed ?? [])].join(" "),
        listenSentence: null,
        explainShown: false,
        closing: false,
        first: false,
      });
      continue;
    }
    const input = step.input ?? "speech";
    const state: ChatEvalState =
      input !== "speech" || step.notCalled === true
        ? { status: "not_called" }
        : step.failed !== undefined
          ? { status: "failed", failure: step.failed }
          : {
              status: "done",
              output: { ...OUT, child_used_on_own: step.used ?? [] },
            };
    judgeRows.push({
      role: "child",
      input,
      heard: input === "speech" ? step.child : "",
      opened: [],
      koHelp: null,
      eval: state,
    });
  }
  const judged = new Map(
    chatJudgesOf(judgeRows, CTX).map(({ row, judge }) => [row, judge]),
  );
  let turnNo = 0;
  return judgeRows.map((row, at) => {
    if (row.role === "teacher") turnNo += 1;
    const step = steps[at] as Step;
    const input = "child" in step ? (step.input ?? "speech") : null;
    return {
      id: `row-${at}`,
      turnNo,
      segment: "talk",
      speaker: row.role === "teacher" ? "tori" : "child",
      text:
        "teacher" in step
          ? step.teacher
          : input === "speech"
            ? step.child
            : null,
      inputMode: input === null ? null : input,
      hintLevel: row.role === "child" ? 0 : null,
      clientListen: null,
      sentUserMessage: null,
      toriRewrite:
        row.role === "teacher" ? JSON.stringify({ say: row.say }) : null,
      aiQuestion: null,
      move:
        "teacher" in step && step.removed !== undefined
          ? talkMoveOf({
              kind: "ai",
              chat: {
                level: {},
                madeUp: [],
                facts: [],
                run: 0,
                removed: step.removed,
              },
            })
          : null,
      chatJudge: judged.get(at) ?? null,
    };
  });
}

/** 수업이 닫힌 뒤의 꼴: 대화 기록 글과 보낸 사용자 메시지를 지운다(closing.ts clearSentMessages). */
function closed<
  R extends { toriRewrite: string | null; sentUserMessage: string | null },
>(rows: readonly R[]): R[] {
  return rows.map((r) => ({ ...r, toriRewrite: null, sentUserMessage: null }));
}

/** AC-9 꼴 합성 수업: 둘 다 인정 2 · 기존 꼴만 3(고르기 답 1 · 물음 낱말 문장 답 2) · 앱만 1, 모름 단추 1 · 판정 없음 1. */
const STEPS: Step[] = [
  { teacher: "What do you like to do at the beach?" },
  { child: "I swim at the beach.", used: ["swim", "beach"] },
  { teacher: "Do you like the sea or the mountain?" },
  { child: "Sea.", used: ["sea"] },
  { teacher: "Do you go to the beach?" },
  { child: "Yes, I go to the beach.", used: ["go", "beach"] },
  { teacher: "What do you drink?" },
  { child: "Water.", used: [] },
  { teacher: "Do you swim?" },
  { child: "", input: "dont_know" },
  { teacher: "That is okay. What is fun?" },
  { child: "I drink water.", failed: "timeout" },
];

function lesson(
  source: "real" | "mock" = "real",
  rows = chatRows(STEPS),
): CompareLesson {
  return {
    sessionId: "0123456789abcdef-session",
    source,
    rows,
    ctx: CTX,
    met: ["beach", "sea"],
    storedMark: null,
  };
}

describe("비교 도구 — 수업별 표(AC-9 도구 몫)", () => {
  it("AC-27i 합성 행에서 수업별 표와 일치 비율 두 값이 나온다(고르기 답을 넣은 값 · 뺀 값)", () => {
    const table = chatLessonTableOf(lesson());
    expect(table.summary.agreement).toEqual({
      withChoice: { pairs: 6, agreed: 2, ratio: 2 / 6 },
      withoutChoice: { pairs: 5, agreed: 2, ratio: 2 / 5 },
    });
    expect(table.summary.counts).toEqual({
      childTurns: 6,
      done: 4,
      failed: 1,
      waiting: 0,
      notCalled: 1,
    });
    expect(table.summary.same.sort()).toEqual(["beach", "swim"]);
    expect(table.human.map((h) => [h.turnNo, h.word, h.side]).sort()).toEqual([
      [2, "sea", "legacy_only"],
      [3, "beach", "legacy_only"],
      [3, "go", "legacy_only"],
      [4, "water", "app_only"],
    ]);
  });

  it("AC-27i 판정 없음 · 부르지 않음은 분모 밖이고 그 수를 까닭별로 따로 적는다", () => {
    const table = chatLessonTableOf(lesson());
    expect(table.failed).toEqual({
      timeout: 1,
      invalid: 0,
      other: 0,
      unknown: 0,
    });
    expect(table.notCalled).toEqual({
      dont_know: 1,
      not_heard: 0,
      quiet: 0,
      speech: 0,
    });
    expect(table.waiting).toBe(0);
  });

  it("AC-27i 한쪽만의 낱말마다 그 차례의 선생님 말 · 들린 글 · 갈래 · 까닭과 빈 사람 판독 칸이 있다", () => {
    const table = chatLessonTableOf(lesson());
    const sea = table.human.find((h) => h.word === "sea");
    expect(sea).toMatchObject({
      session: "01234567",
      turnNo: 2,
      side: "legacy_only",
      category: "echoed_word",
      reasons: ["choice_answer"],
      teacherSay: "Do you like the sea or the mountain?",
      heard: "Sea.",
      verdict: "",
    });
    const md = chatCompareMarkdownOf(chatCompareReportOf([table]));
    expect(md).toContain("Do you like the sea or the mountain?");
    expect(md).toContain("앱 쪽이 맞음 · 같음 · 기존 꼴 쪽이 맞음");
    // 세션 id 는 앞 여덟 자만
    expect(md).toContain("01234567");
    expect(md).not.toContain("0123456789abcdef-session");
  });

  it("AC-27i 한쪽만의 낱말 무리는 겹치지 않고, 까닭 없음 세 무리와 까닭 있는 낱말의 합이 한쪽만 쌍 수와 같다", () => {
    const table = chatLessonTableOf(lesson());
    const kindOf = (word: string) =>
      table.human.find((h) => h.word === word)?.kind;
    expect(kindOf("sea")).toBe("reason");
    expect(kindOf("go")).toBe("question_words_answer");
    expect(kindOf("beach")).toBe("question_words_answer");
    expect(kindOf("water")).toBe("no_reason");
    const report = chatCompareReportOf([table]);
    expect(report.kinds.real).toEqual({
      reason: 1,
      question_words_answer: 2,
      homophone: 0,
      no_reason: 1,
    });
    expect(report.reasonCounts.real.choice_answer).toBe(1);
    const sum = Object.values(report.kinds.real).reduce((a, b) => a + b, 0);
    expect(sum).toBe(report.totals.real.oneSide);
    const md = chatCompareMarkdownOf(report);
    expect(md).toContain("까닭이 여럿이면 각각 셉니다");
    expect(md).toContain(
      "저장값과 다른 행이 있으면 먼저 다시 세운 선생님 행 수를 봅니다",
    );
    expect(md).toContain(
      "까닭 있는 낱말 1 + 물음 낱말 문장 답 2 + 같은 소리 0 + 나머지 1 = 4(한쪽만 인정한 쌍 4)",
    );
    // 출처: 첫 아이 차례는 앞 아이 차례가 없고(app_no_child), 그 뒤는 앞 평가 출력(eval)
    expect(report.bySource.real.app_no_child).toEqual({ pairs: 2, agreed: 2 });
    expect(report.bySource.real.eval).toEqual({ pairs: 4, agreed: 0 });
  });

  it("AC-27i 물음이 아닌 문장을 그대로 되풀이한 말은 물음 낱말 문장 답 무리에 들지 않는다", () => {
    const table = chatLessonTableOf(
      lesson(
        "real",
        chatRows([
          { teacher: "I go to the beach." },
          { child: "I go to the beach.", used: ["go", "beach"] },
        ]),
      ),
    );
    expect(table.human.map((h) => [h.word, h.category, h.kind]).sort()).toEqual(
      [
        ["beach", "echoed_word", "no_reason"],
        ["go", "echoed_word", "no_reason"],
      ],
    );
  });

  it("AC-27i 같은 소리로만 이은 낱말은 같은 소리 무리로 따로 센다", () => {
    const table = chatLessonTableOf(
      lesson(
        "real",
        chatRows([
          { teacher: "What is blue and big?" },
          { child: "See.", used: ["sea"] },
        ]),
      ),
    );
    // 단원에 see · sea 가 함께 있어 앱은 글자대로 see, 기존 꼴은 소리로 sea 를 인정했다 — 두 쌍 모두 같은 소리 무리
    expect(table.human.map((h) => [h.word, h.side, h.kind]).sort()).toEqual([
      ["sea", "legacy_only", "homophone"],
      ["see", "app_only", "homophone"],
    ]);
    expect(chatCompareReportOf([table]).kinds.real.homophone).toBe(2);
  });

  it("AC-27i 표지 행 요약과 다시 센 요약을 견준다(같음 · 다름)", () => {
    const first = chatLessonTableOf(lesson());
    const same = chatLessonTableOf({ ...lesson(), storedMark: first.summary });
    expect(same.markDiffers).toBe(false);
    const other = chatLessonTableOf({
      ...lesson(),
      storedMark: {
        ...first.summary,
        counts: { ...first.summary.counts, childTurns: 7 },
      },
    });
    expect(other.markDiffers).toBe(true);
    expect(chatCompareReportOf([same, other]).stale.real.marks).toBe(1);
  });

  it("AC-27i 말 입력인데 부르지 않음으로 저장된 행은 부르지 않음의 speech 로 따로 센다", () => {
    const table = chatLessonTableOf(
      lesson(
        "real",
        chatRows([
          { teacher: "What do you drink?" },
          { child: "Water.", notCalled: true },
        ]),
      ),
    );
    expect(table.notCalled).toEqual({
      dont_know: 0,
      not_heard: 0,
      quiet: 0,
      speech: 1,
    });
    expect(table.summary.counts.done).toBe(0);
  });

  it("AC-27i 물음 낱말 문장 답의 낱말 수는 판정 모듈이 아이 말에서 빼는 군말을 뺀 수다", () => {
    const table = chatLessonTableOf(
      lesson(
        "real",
        chatRows([
          { teacher: "Do you like the sea?" },
          { child: "Uh, sea.", used: ["sea"] },
          { teacher: "Do you like the sea?" },
          { child: "I like the sea.", used: ["sea"] },
        ]),
      ),
    );
    expect(table.human.map((h) => [h.turnNo, h.word, h.kind])).toEqual([
      [1, "sea", "no_reason"],
      [2, "sea", "question_words_answer"],
    ]);
  });

  const CLOSED_STEPS: Step[] = [
    { teacher: "What do you like?" },
    { child: "", input: "dont_know" },
    { teacher: "That's okay.", removed: ["The sea or the mountain?"] },
    { child: "Sea.", used: ["sea"] },
    { teacher: "Nice!", removed: ["I see the sea."] },
    { child: "I see the sea.", used: ["see", "sea"] },
  ];

  it("AC-27i 닫힌 꼴 행(대화 기록 글 · 보낸 메시지 없음, 뺀 문장은 move)에서 저장값과 다른 행이 없고 일치 두 값이 열린 꼴과 같다", () => {
    const open = chatLessonTableOf(lesson("real", chatRows(CLOSED_STEPS)));
    const shut = chatLessonTableOf(
      lesson("real", closed(chatRows(CLOSED_STEPS))),
    );
    expect(shut.stale).toEqual([]);
    expect(shut.summary.agreement).toEqual(open.summary.agreement);
    expect(shut.summary.oneSide).toEqual(open.summary.oneSide);
    expect(open.rebuiltTeachers).toBe(0);
    expect(shut.rebuiltTeachers).toBe(2);
    // 막힌 뒤 고르기 물음(소리 줄로 뺌) 뒤의 'Sea.' 는 닫힌 꼴에서도 두 판정 모두 인정하지 않는다(고르기 답 보류 · 들은 도움)
    expect(shut.human.filter((h) => h.turnNo === 2)).toEqual([]);
    // 사람 판독 칸의 선생님 말도 다시 세운 글(뺀 따라 할 문장이 듦)
    const turn3 = shut.human.filter((h) => h.turnNo === 3);
    expect(turn3.length).toBeGreaterThan(0);
    for (const h of turn3) expect(h.teacherSay).toBe("Nice! I see the sea.");
  });

  it("AC-27i 원문이 지워져 다시 세울 수 없는 수업은 표와 합계에서 빼고 수만 따로 센다", () => {
    const erased = closed(
      chatRows([
        { teacher: "That's okay.", removed: [] },
        { child: "Sea.", used: ["sea"] },
      ]),
    );
    const report = chatCompareReportOf([
      chatLessonTableOf(lesson("real")),
      chatLessonTableOf({ ...lesson("real", erased), sessionId: "ffffeeee-x" }),
    ]);
    expect(report.totals.real.lessons).toBe(1);
    expect(report.tables).toHaveLength(1);
    expect(report.lost.real).toEqual(["ffffeeee"]);
    expect(chatCompareMarkdownOf(report)).toContain(
      "원문이 지워져 다시 세울 수 없는 수업(표 · 합계 밖): 1",
    );
  });

  it("AC-27i 저장된 판정을 믿지 않고 다시 센다 — 저장값과 다르면 그 행을 적는다", () => {
    const rows = chatRows(STEPS);
    const at = rows.findIndex((r) => r.text === "Water.");
    const stored = structuredClone(rows[at]?.chatJudge) as {
      app: { said: string[] };
    };
    stored.app.said = [];
    const tampered = rows.map((r, i) =>
      i === at ? { ...r, chatJudge: stored } : r,
    );
    const table = chatLessonTableOf(lesson("real", tampered));
    expect(table.stale).toEqual([{ turnNo: 4, parts: ["app"] }]);
    // 표는 다시 센 값이다(저장값의 빈 앱 said 가 아니라 water)
    expect(table.summary.appSaid).toContain("water");
  });

  it("AC-27i 실제 수업과 모의 수업은 합계에서 섞지 않는다", () => {
    const report = chatCompareReportOf([
      chatLessonTableOf(lesson("real")),
      chatLessonTableOf(lesson("mock")),
      chatLessonTableOf(lesson("mock")),
    ]);
    expect(report.totals.real.lessons).toBe(1);
    expect(report.totals.mock.lessons).toBe(2);
    expect(report.totals.mock.agreement.withChoice).toEqual({
      pairs: 12,
      agreed: 4,
      ratio: 4 / 12,
    });
    expect(report.totals.real.agreement.withoutChoice.pairs).toBe(5);
  });
});

// ── 대조 갈래(AC-20) ─────────────────────────────────────────────────

function leadRow(
  over: Partial<LeadRowLike> & Pick<LeadRowLike, "speaker">,
): LeadRowLike {
  return {
    id: `lead-${Math.random()}`,
    turnNo: 0,
    segment: "talk",
    text: null,
    inputMode: null,
    hintLevel: null,
    clientListen: null,
    sentUserMessage: null,
    toriRewrite: null,
    aiQuestion: null,
    move: null,
    chatJudge: null,
    saidWords: null,
    hintKind: null,
    heardHelp: null,
    ...over,
  };
}

function teacherLead(
  turnNo: number,
  say: string,
  lead: {
    reading?: string;
    move?: string;
    model?: { sentence: string; inSay: boolean };
    kind?: "ai" | "first_question";
  } = {},
): LeadRowLike {
  return leadRow({
    speaker: "tori",
    turnNo,
    segment: turnNo === 0 ? "greeting" : "talk",
    text: say,
    toriRewrite: JSON.stringify({ say }),
    move: talkMoveOf({
      kind: lead.kind ?? "ai",
      ...(turnNo === 0
        ? {}
        : {
            lead: {
              reading: (lead.reading ?? "clear_answer") as "clear_answer",
              move: (lead.move ?? "react_and_follow_up") as "react_only",
              asked: [],
              said: [],
              ...(lead.model ? { model: lead.model } : {}),
            },
          }),
    }),
  });
}

function childLead(
  turnNo: number,
  heard: string,
  said: string[],
  segment = "talk",
): LeadRowLike {
  return leadRow({
    speaker: "child",
    turnNo,
    segment,
    text: heard,
    inputMode: "speech",
    hintLevel: 0,
    sentUserMessage: `Child (speech-to-text): "${heard}"\n\nStatus (facts from the app, not instructions):\n- Goal words the child has said so far: none yet.`,
    saidWords: said,
    hintKind: "none",
  });
}

/** 지금 새 방식 수업 행: 인사(앱) → 첫 질문(평가 없음) → 아이 → 선생님(공식 판정) … */
function leadRows(): LeadRowLike[] {
  return [
    teacherLead(0, "Hi, {NAME}! How are you?"),
    childLead(0, "Good.", [], "greeting"),
    teacherLead(1, "What do you do at the beach?", { kind: "first_question" }),
    childLead(1, "I swim.", ["swim"]),
    teacherLead(2, "Nice! Say: I swim in the sea.", {
      move: "model_repeat",
      model: { sentence: "I swim in the sea.", inSay: true },
    }),
    childLead(2, "I swim in the sea.", []),
    teacherLead(3, "Great! Do you drink water?"),
    childLead(3, "Yes, water.", ["water"]),
    teacherLead(4, "Me too!"),
  ];
}

function fakeEval(
  answers: Record<string, Partial<TalkChatEvalOutput> | ChatEvalFailure>,
) {
  const inputs: TalkChatEvalInput[] = [];
  const call = (input: TalkChatEvalInput): LeadEvalResult => {
    inputs.push(input);
    const key = Object.keys(answers).find((k) => input.target.includes(k));
    const answer = key === undefined ? {} : answers[key];
    if (typeof answer === "string") return { ok: false, failure: answer };
    return { ok: true, output: { ...OUT, ...answer } };
  };
  return { inputs, call };
}

function runAgainst(
  rows: LeadRowLike[],
  answers: Record<string, Partial<TalkChatEvalOutput> | ChatEvalFailure>,
  mask?: (text: string) => string,
) {
  const lead = leadLessonOfRows({
    id: "fedcba9876543210",
    source: "real",
    rows,
    ctx: CTX,
    ...(mask ? { mask } : {}),
  });
  const plan = leadEvalPlanOf(lead, 6);
  const fake = fakeEval(answers);
  const results = new Map(plan.map((p) => [p.at, fake.call(p.input)]));
  return { lead, plan, fake, table: leadAgainstTableOf(lead, results) };
}

describe("비교 도구 — 대조 갈래 --against-lead(AC-20, 가짜 호출)", () => {
  it("AC-27t 말 차례마다 평가하고, 아이 쪽 입력은 이야기 방식의 입력 줄이다(지금 새 방식의 사실 줄 없음)", () => {
    const { plan, fake } = runAgainst(leadRows(), {});
    // 인사 답(첫 질문 앞)은 공식 판정이 대화 호출의 것이 아니라 맞대지 않지만, 다음 차례의 앞 선생님 행동을 평가 출력으로 만들려고 평가는 부른다
    expect(plan.map((p) => p.input.target)).toEqual([
      'Child (speech-to-text): "Good."',
      'Child (speech-to-text): "I swim."',
      'Child (speech-to-text): "I swim in the sea."',
      'Child (speech-to-text): "Yes, water."',
    ]);
    expect(fake.inputs).toHaveLength(4);
    // 지금 새 방식의 사실 줄(Status …)은 싣지 않는다
    for (const input of fake.inputs)
      expect(JSON.stringify(input)).not.toContain("Status (facts");
    expect(plan[1]?.input.after).toBe("Nice! Say: I swim in the sea.");
  });

  it("AC-27t 같은 차례에서 공식 said 와 기존 꼴 said 를 맞대 일치 비율 두 값을 낸다", () => {
    const { table } = runAgainst(leadRows(), {
      '"I swim."': {
        child_used_on_own: ["swim"],
        teacher_move: "model_repeat",
        model_sentence: "I swim in the sea.",
      },
      '"I swim in the sea."': {
        reading: "repeated_my_model",
        child_used_on_own: [],
      },
      '"Yes, water."': { child_used_on_own: [] },
    });
    expect(table.agreement).toEqual({
      withChoice: { pairs: 2, agreed: 1, ratio: 0.5 },
      withoutChoice: { pairs: 2, agreed: 1, ratio: 0.5 },
    });
    const water = table.human.find((h) => h.word === "water");
    expect(water).toMatchObject({
      side: "official_only",
      teacherSay: "Great! Do you drink water?",
      heard: "Yes, water.",
      official: { reading: "clear_answer", move: "react_and_follow_up" },
      evaluated: { reading: "clear_answer", move: "react_and_follow_up" },
      verdict: "",
    });
  });

  it("AC-27t 앞 선생님 행동은 공식 값이 아니라 평가 출력으로 만들고, 따라 할 문장 자리에는 기록의 값을 넣는다", () => {
    // 공식 move 는 model_repeat 이지만, 평가가 react_only 라 하면 기존 꼴 앞 행동은 평가 출력에서 온다(출처 eval)
    const { table } = runAgainst(leadRows(), {
      '"I swim."': { child_used_on_own: ["swim"], teacher_move: "react_only" },
      '"I swim in the sea."': { child_used_on_own: ["swim", "sea"] },
    });
    const turn = table.turns.find((t) => t.turnNo === 2);
    expect(turn?.prevMove).toBe("eval");
    expect(turn?.listenSentence).toBe("I swim in the sea.");
    // 평가 출력의 model_sentence 가 비어도 기록의 따라 할 문장이 하한이라 들은 도움(답 예시)이 붙어 기존 꼴은 인정하지 않는다
    expect(turn?.legacySaid).toEqual([]);
  });

  it("AC-27t 판정 없음은 분모 밖이고 까닭별로 센다", () => {
    const { table } = runAgainst(leadRows(), { '"Yes, water."': "timeout" });
    expect(table.failed).toEqual({
      timeout: 1,
      invalid: 0,
      other: 0,
      unknown: 0,
    });
    expect(table.counts.evaluated).toBe(2);
    expect(table.counts.notJudged).toBe(1);
  });

  it("AC-27t 닫힌 지금 새 방식 행이면 평가 입력의 선생님 말에 글에서 뺀 문장이 든다", () => {
    const rows = closed(leadRows()).map((r) => {
      if (r.speaker !== "tori" || r.turnNo !== 2) return r;
      return {
        ...r,
        text: "Nice! Say:",
        move: talkMoveOf({
          kind: "ai",
          lead: {
            reading: "clear_answer",
            move: "model_repeat",
            asked: [],
            said: [],
            model: { sentence: "I swim in the sea.", inSay: true },
            removed: ["I swim in the sea."],
          },
        }),
      };
    });
    const { plan, table } = runAgainst(rows, {});
    expect(plan[1]?.input.after).toBe("Nice! Say: I swim in the sea.");
    expect(table.turns.find((t) => t.turnNo === 2)?.listenSentence).toBe(
      "I swim in the sea.",
    );
  });

  it("AC-27t 대조 표와 합계에 선생님 말을 다시 세운 선생님 행 수를 적는다(실제 수업만, 재검토 N-1)", () => {
    const rows = closed(leadRows()).map((r) => {
      if (r.speaker !== "tori" || r.turnNo !== 2) return r;
      return {
        ...r,
        text: "Nice! Say:",
        move: talkMoveOf({
          kind: "ai",
          lead: {
            reading: "clear_answer",
            move: "model_repeat",
            asked: [],
            said: [],
            model: { sentence: "I swim in the sea.", inSay: true },
            removed: ["I swim in the sea."],
          },
        }),
      };
    });
    const closedTable = runAgainst(rows, {}).table;
    const openTable = runAgainst(leadRows(), {}).table;
    expect(closedTable.rebuiltTeachers).toBe(1);
    expect(openTable.rebuiltTeachers).toBe(0);
    const report = leadAgainstReportOf([closedTable, openTable]);
    expect(report.totals.real.rebuiltTeachers).toBe(1);
    const md = leadAgainstMarkdownOf(report);
    expect(md).toContain("- 선생님 말을 다시 세운 선생님 행: 1");
    expect(md).toContain("뺀 문장을 끝에 붙여 다시 세운 글");
  });

  it("AC-27t 원문이 지워진 지금 새 방식 수업은 대조 표와 합계에서 빼고 수만 센다", () => {
    const rows = closed(leadRows()).map((r) =>
      r.speaker === "tori" && r.turnNo === 2
        ? {
            ...r,
            move: talkMoveOf({
              kind: "ai",
              lead: {
                reading: "clear_answer",
                move: "model_repeat",
                asked: [],
                said: [],
                model: { sentence: "", inSay: false },
                removed: [],
              },
            }),
          }
        : r,
    );
    const { table, lead } = runAgainst(rows, {});
    expect(lead.sayLost).toBe(true);
    const report = leadAgainstReportOf([table]);
    expect(report.totals.real.lessons).toBe(0);
    expect(report.lost.real).toEqual(["fedcba98"]);
  });

  it("AC-27t 대조는 기록을 고치지 않는다(행 그대로)", () => {
    const rows = leadRows();
    const before = structuredClone(rows);
    runAgainst(rows, { '"I swim."': { child_used_on_own: ["swim"] } });
    expect(rows).toEqual(before);
  });

  it("AC-27t 실험 기록(runs/N-*.jsonl)은 모의 수업으로 읽고 lead.child 가 있는 차례만 공식 판정으로 맞댄다", () => {
    const records = [
      { type: "lesson", lesson: "N-SA-s1", arm: "N" },
      {
        type: "teacher_turn",
        childTurn: 0,
        final: "Hi, {NAME}! How are you?",
        lead: null,
      },
      { type: "child_turn", childTurn: 1, action: "speak", heard: "Good." },
      {
        type: "teacher_turn",
        childTurn: 1,
        final: "Fun! What do you see?",
        lead: {
          kind: "first_question",
          closing: false,
          reading: "new_topic",
          move: "bridge_to_goal",
          say: "What do you see?",
          sound: {},
          child: null,
        },
      },
      {
        type: "child_turn",
        childTurn: 2,
        action: "speak",
        heard: "I see sea.",
      },
      {
        type: "teacher_turn",
        childTurn: 2,
        final: "Nice! Say:\nI see the sea.",
        lead: {
          kind: "ai",
          closing: false,
          reading: "clear_answer",
          move: "model_repeat",
          say: "Nice! Say: I see the sea.",
          sound: { model: "I see the sea." },
          child: {
            text: "I see sea.",
            saidWords: ["see", "sea"],
            hintKind: "none",
            hintLevel: 0,
            heardHelp: null,
          },
        },
      },
      { type: "child_turn", childTurn: 3, action: "dont_know", heard: null },
      {
        type: "teacher_turn",
        childTurn: 3,
        final: "That's okay!",
        lead: {
          kind: "ai",
          closing: false,
          reading: "does_not_know",
          move: "react_only",
          say: "That's okay!",
          sound: {},
          child: {
            text: null,
            saidWords: [],
            hintKind: "none",
            hintLevel: 0,
            heardHelp: null,
          },
        },
      },
    ];
    const lead = leadLessonOfRun({ id: "N-SA-s1", records, ctx: CTX });
    expect(lead.source).toBe("mock");
    const plan = leadEvalPlanOf(lead, 6);
    expect(plan.map((p) => p.input.target)).toEqual([
      'Child (speech-to-text): "Good."',
      'Child (speech-to-text): "I see sea."',
    ]);
    const teacher = lead.turns.find(
      (t) => t.role === "teacher" && t.say.startsWith("Nice"),
    );
    expect(teacher).toMatchObject({
      listenSentence: "I see the sea.",
      say: "Nice! Say: I see the sea.",
    });
    const table = leadAgainstTableOf(
      lead,
      new Map(
        plan.map((p) => [
          p.at,
          {
            ok: true,
            output: { ...OUT, child_used_on_own: ["see", "sea"] },
          } as const,
        ]),
      ),
    );
    expect(table.agreement.withChoice).toEqual({
      pairs: 2,
      agreed: 2,
      ratio: 1,
    });
    expect(table.counts).toMatchObject({
      evaluated: 1,
      notCalled: 1,
      notJudged: 1,
    });
  });

  it("AC-27t 실제 · 모의 합계를 따로 내고 표에 사람 판독 칸이 있다", () => {
    const real = runAgainst(leadRows(), {
      '"I swim."': { child_used_on_own: ["swim"] },
    }).table;
    const report = leadAgainstReportOf([real]);
    expect(report.totals.real.lessons).toBe(1);
    expect(report.totals.mock.lessons).toBe(0);
    const md = leadAgainstMarkdownOf(report);
    expect(md).toContain("앱 쪽이 맞음 · 같음 · 기존 꼴 쪽이 맞음");
    expect(md).toContain("fedcba98");
    expect(md).not.toContain("fedcba9876543210");
    // 머리의 안내 줄(M-5): 판정 없음의 까닭은 앱 기록과 견주지 않음 · 설정은 시드 파일
    expect(md).toContain("판정 없음의 까닭별 수는 앱의 기록과 견주지 않습니다");
    expect(md).toContain("설정 값은 DB 가 아니라 시드 파일");
  });

  it("AC-27t 차례별 따라 할 문장에도 이름 가림을 건다(JSON 의 turns 칸)", () => {
    const { table } = runAgainst(
      leadRows(),
      { '"I swim."': { child_used_on_own: ["swim"] } },
      (text) => text.replace("sea", "[가림]"),
    );
    const turn = table.turns.find((t) => t.turnNo === 2);
    expect(turn?.listenSentence).toBe("I swim in the [가림].");
  });

  it("AC-27t 부를 호출 수와 어림 비용을 먼저 낸다(최대 출력으로 위쪽 어림)", () => {
    const { plan } = runAgainst(leadRows(), {});
    const prices = JSON.parse(
      readFileSync(join(process.cwd(), "seed/model-prices.json"), "utf8"),
    );
    const book = priceBookOf(priceRowsOfSeed(prices), "2026-11-13");
    const estimate = leadEvalEstimateOf({
      inputs: plan.map((p) => p.input),
      model: "claude-sonnet-5-5",
      maxTokens: 400,
      book,
    });
    expect(estimate.calls).toBe(4);
    expect(estimate.inputTokens).toBeGreaterThan(0);
    expect(estimate.outputTokens).toBe(1600);
    expect(Number(estimate.costUsd)).toBeGreaterThan(0);
  });
});

// ── 인자 · 출력 자리 ─────────────────────────────────────────────────

describe("비교 도구 — 인자와 출력 자리", () => {
  it("AC-27t 대조 갈래의 실제 호출은 --call 이 있을 때만이고, 없으면 계획만 낸다", () => {
    const plan = parseCompareArgs([
      "--against-lead",
      "--runs",
      "/x",
      "--out",
      "/tmp/o",
    ]);
    expect(plan).toMatchObject({
      ok: true,
      args: { mode: "against-lead", ai: "plan" },
    });
    const call = parseCompareArgs([
      "--against-lead",
      "--runs",
      "/x",
      "--out",
      "/tmp/o",
      "--call",
      "--max-calls",
      "300",
    ]);
    expect(call).toMatchObject({
      ok: true,
      args: { ai: "call", maxCalls: 300 },
    });
    // 실제 호출에는 호출 수 상한이 꼭 있어야 한다(M-4)
    expect(
      parseCompareArgs([
        "--against-lead",
        "--runs",
        "/x",
        "--out",
        "/tmp/o",
        "--call",
      ]).ok,
    ).toBe(false);
    expect(
      parseCompareArgs([
        "--against-lead",
        "--runs",
        "/x",
        "--out",
        "/tmp/o",
        "--call",
        "--max-calls",
        "0",
      ]).ok,
    ).toBe(false);
    const fake = parseCompareArgs([
      "--against-lead",
      "--db",
      "--out",
      "/tmp/o",
      "--fake-ai",
    ]);
    expect(fake).toMatchObject({ ok: true, args: { ai: "fake" } });
    // 비교 갈래에는 호출이 없다
    expect(parseCompareArgs(["--db", "--out", "/tmp/o", "--call"]).ok).toBe(
      false,
    );
    // 출력 자리는 꼭 받는다
    expect(parseCompareArgs(["--db"]).ok).toBe(false);
    // 읽을 곳이 하나는 있어야 한다
    expect(parseCompareArgs(["--out", "/tmp/o"]).ok).toBe(false);
  });

  it("AC-27t 계획한 호출 수가 상한을 넘으면 부르지 않는다", () => {
    expect(callLimitProblemOf(219, 219)).toBeNull();
    expect(callLimitProblemOf(220, 219)).not.toBeNull();
  });

  it("AC-27i 출력 자리가 저장소 안이면 거부한다(아이 말 원문)", () => {
    const root = resolve("/repo/main");
    const worktree = resolve("/repo/main/.claude/worktrees/p13d");
    const roots = [root, worktree];
    expect(outPathProblemOf("/repo/main/out", roots)).not.toBeNull();
    expect(outPathProblemOf("/repo/main", roots)).not.toBeNull();
    expect(
      outPathProblemOf("/repo/main/.claude/worktrees/p13d/x", roots),
    ).not.toBeNull();
    // 저장소 안의 '..' 로 시작하는 이름의 폴더도 안이다
    expect(outPathProblemOf("/repo/main/..out", roots)).not.toBeNull();
    expect(outPathProblemOf("/repo/main-other/out", roots)).toBeNull();
    expect(outPathProblemOf("/private/tmp/compare", roots)).toBeNull();
  });
});

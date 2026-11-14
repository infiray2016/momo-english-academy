// 회화 이야기 방식의 수업별 비교 집계와 일치 비율(intent 2026-11-13-회화-대화-구조-R spec 설계 13 '수업별 비교 기록' · '일치 비율' · '직접 대조',
// plan 묶음 P4 · AC-9 · AC-20 의 순수 몫). 아이 행의 chat_judge 를 모아 같은 낱말 · 한쪽만의 낱말 · 까닭 표지 · 판정 없음 · 기다림 수와 일치 비율
// 두 값(고르기 답을 넣은 값 · 뺀 값)을 낸다. 실제 수업과 모의 수업은 섞지 않는다. 학습 근거 · 통과 · 승급의 입력이 아니다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { TalkChatEvalOutput } from "@/core/ai/calls/talk-chat-eval";
import {
  ChatCompareSummarySchema,
  chatAgreementOf,
  chatCompareOf,
  chatCompareTotalsOf,
  chatTurnPairsOf,
} from "@/core/conversation/chat-compare";
import {
  type ChatAppCategory,
  type ChatJudge,
  type ChatJudgeRow,
  type ChatLegacyStatus,
  chatJudgesOf,
} from "@/core/conversation/chat-judge";
import { HomophonesFileSchema } from "@/core/seed/schema/reference";
import { lemmaLookup } from "@/core/session/attempt";

type AppWord = {
  word: string;
  category: ChatAppCategory;
  accepted: boolean;
  choiceAnswer?: boolean;
};

/** 합성 chat_judge 하나: 앱 낱말(갈래 · 인정) · 앱 said 는 인정한 낱말 · 기존 꼴 said. */
function judge({
  app = [],
  legacy = [],
  status = "done",
  stuck = false,
  askAgain = false,
  legacyHint = "none",
  appHint = "none",
  appStuck = false,
}: {
  app?: AppWord[];
  legacy?: string[];
  status?: ChatLegacyStatus;
  stuck?: boolean;
  askAgain?: boolean;
  legacyHint?: "none" | "meaning_only" | "english";
  appHint?: "none" | "meaning_only" | "english";
  appStuck?: boolean;
}): ChatJudge {
  const isDone = status === "done";
  return {
    app: {
      stuck: appStuck,
      hintKind: appHint,
      words: app.map((w) => ({ choiceAnswer: false, ...w })),
      said: app.filter((w) => w.accepted).map((w) => w.word),
    },
    legacy: {
      status,
      output: isDone
        ? {
            reading: "clear_answer",
            teacher_move: askAgain ? "ask_again" : "react_only",
            model_sentence: "",
            child_used_on_own: legacy,
          }
        : null,
      said: isDone ? legacy : [],
      stuck: isDone ? stuck : null,
      askAgain: isDone ? askAgain : null,
      afterAskAgain: isDone ? false : null,
      help: isDone
        ? { hintKind: legacyHint, hintLevel: 0, heardHelp: null }
        : null,
      prevMove: isDone ? "app_no_child" : null,
    },
  };
}

/**
 * AC-9 의 합성 기록: 둘 다 인정 2(beach · swim) · 한쪽만 인정 2(sea — 기존 꼴만, 고르기 답 표지 / sky — 앱만) · 둘 다 인정하지 않음 10 ·
 * 고르기 답 표지 1(sea).
 */
function syntheticRows() {
  const neither: AppWord[] = [
    "go",
    "see",
    "mountain",
    "drink",
    "water",
    "milk",
    "cloud",
    "sun",
    "rain",
    "tree",
  ].map((word) => ({ word, category: "echoed_word", accepted: false }));
  return [
    {
      row: 1,
      judge: judge({
        app: [
          { word: "beach", category: "own_sentence", accepted: true },
          { word: "swim", category: "own_sentence", accepted: true },
        ],
        legacy: ["beach", "swim"],
      }),
    },
    {
      row: 3,
      judge: judge({
        app: [
          {
            word: "sea",
            category: "echoed_word",
            accepted: false,
            choiceAnswer: true,
          },
        ],
        legacy: ["sea"],
      }),
    },
    {
      row: 5,
      judge: judge({
        app: [{ word: "sky", category: "own_sentence", accepted: true }],
        legacy: [],
        askAgain: true,
      }),
    },
    { row: 7, judge: judge({ app: neither.slice(0, 5) }) },
    { row: 9, judge: judge({ app: neither.slice(5) }) },
  ];
}

describe("일치 비율(설계 13 — 단위는 (아이 차례, 단원 단어) 쌍)", () => {
  it("AC-27i 합성 기록(둘 다 2 · 한쪽만 2 · 둘 다 아님 10 · 고르기 답 1): 분모는 둘 다 인정하지 않은 쌍을 세지 않고, 고르기 답을 넣은 값 · 뺀 값이 따로 나온다", () => {
    const summary = chatCompareOf({
      rows: syntheticRows(),
      met: [],
      source: "real",
      homophones: [],
    });
    expect(summary.agreement).toEqual({
      withChoice: { pairs: 4, agreed: 2, ratio: 0.5 },
      withoutChoice: { pairs: 3, agreed: 2, ratio: 2 / 3 },
    });
  });

  it("AC-27i 같은 낱말 · 한쪽만의 낱말 · 까닭 표지가 기대값과 같다", () => {
    const summary = chatCompareOf({
      rows: syntheticRows(),
      met: ["beach", "sea"],
      source: "real",
      homophones: [],
    });
    expect(summary.same).toEqual(["beach", "swim"]);
    expect(summary.legacySaid).toEqual(["beach", "swim", "sea"]);
    expect(summary.appSaid).toEqual(["beach", "swim", "sky"]);
    expect(summary.met).toEqual(["beach", "sea"]);
    expect(summary.oneSide).toEqual([
      {
        row: 3,
        word: "sea",
        side: "legacy_only",
        category: "echoed_word",
        reasons: ["choice_answer"],
      },
      {
        row: 5,
        word: "sky",
        side: "app_only",
        category: "own_sentence",
        reasons: ["ask_again_unknown"],
      },
    ]);
  });

  it("AC-27i 까닭 표지: 기존 꼴 막힘 · 힌트 종류 차이 · 앱 판정에 없는 낱말(갈래 없음)", () => {
    const summary = chatCompareOf({
      rows: [
        {
          row: 1,
          judge: judge({
            app: [{ word: "sea", category: "own_sentence", accepted: true }],
            legacy: [],
            stuck: true,
          }),
        },
        {
          row: 3,
          judge: judge({
            app: [{ word: "milk", category: "helped", accepted: true }],
            legacy: [],
            appHint: "meaning_only",
            legacyHint: "english",
          }),
        },
        { row: 5, judge: judge({ app: [], legacy: ["sun"] }) },
      ],
      met: [],
      source: "mock",
      homophones: [],
    });
    expect(summary.oneSide).toEqual([
      {
        row: 1,
        word: "sea",
        side: "app_only",
        category: "own_sentence",
        reasons: ["legacy_stuck"],
      },
      {
        row: 3,
        word: "milk",
        side: "app_only",
        category: "helped",
        reasons: ["hint_kind_differs"],
      },
      { row: 5, word: "sun", side: "legacy_only", category: null, reasons: [] },
    ]);
  });

  it("AC-27i 판정 없음 · 기다림 · 부르지 않음 차례는 분모에서 빼고 그 수를 따로 적는다", () => {
    const rows = [
      ...syntheticRows(),
      {
        row: 11,
        judge: judge({
          app: [{ word: "sun", category: "own_sentence", accepted: true }],
          status: "failed",
        }),
      },
      {
        row: 13,
        judge: judge({
          app: [{ word: "tree", category: "own_sentence", accepted: true }],
          status: "waiting",
        }),
      },
      { row: 15, judge: judge({ status: "not_called" }) },
    ];
    const summary = chatCompareOf({
      rows,
      met: [],
      source: "real",
      homophones: [],
    });
    expect(summary.counts).toEqual({
      childTurns: 8,
      done: 5,
      failed: 1,
      waiting: 1,
      notCalled: 1,
    });
    expect(summary.agreement.withChoice).toEqual({
      pairs: 4,
      agreed: 2,
      ratio: 0.5,
    });
    // 판정 없음 · 기다림 차례의 앱 낱말은 비교 낱말에 들지 않는다
    expect(summary.appSaid).not.toContain("sun");
    expect(summary.oneSide.map((o) => o.word)).not.toContain("tree");
  });

  it("AC-27i 쌍이 하나도 없으면 비율은 null 이다(0 으로 나누지 않음)", () => {
    expect(chatAgreementOf([])).toEqual({
      withChoice: { pairs: 0, agreed: 0, ratio: null },
      withoutChoice: { pairs: 0, agreed: 0, ratio: null },
    });
  });

  it("AC-27i 실제 수업과 모의 수업은 따로 센다(합계가 섞이지 않음)", () => {
    const real = chatCompareOf({
      rows: syntheticRows(),
      met: [],
      source: "real",
      homophones: [],
    });
    const mock = chatCompareOf({
      rows: [
        {
          row: 1,
          judge: judge({
            app: [{ word: "sea", category: "own_sentence", accepted: true }],
            legacy: ["sea"],
          }),
        },
      ],
      met: [],
      source: "mock",
      homophones: [],
    });
    const totals = chatCompareTotalsOf([real, mock, real]);
    expect(totals.real.lessons).toBe(2);
    expect(totals.mock.lessons).toBe(1);
    expect(totals.real.agreement.withChoice).toEqual({
      pairs: 8,
      agreed: 4,
      ratio: 0.5,
    });
    expect(totals.real.agreement.withoutChoice).toEqual({
      pairs: 6,
      agreed: 4,
      ratio: 4 / 6,
    });
    expect(totals.mock.agreement.withChoice).toEqual({
      pairs: 1,
      agreed: 1,
      ratio: 1,
    });
    expect(totals.real.counts.childTurns).toBe(10);
    expect(totals.mock.counts.childTurns).toBe(1);
    expect(totals.real.oneSide).toBe(4);
  });

  it("AC-27i 수업별 요약은 비교 표지 행 규격을 지나고 아이 말 글을 담지 않는다", () => {
    const summary = chatCompareOf({
      rows: syntheticRows(),
      met: ["beach"],
      source: "real",
      homophones: [],
    });
    expect(ChatCompareSummarySchema.parse(summary)).toEqual(summary);
    expect(JSON.stringify(summary)).not.toMatch(/heard|say"/);
    expect(
      ChatCompareSummarySchema.safeParse({ ...summary, source: "both" })
        .success,
    ).toBe(false);
  });
});

describe("직접 대조의 순수 몫(AC-20 — 공식 판정과 기존 꼴 said 를 같은 차례에서)", () => {
  it("AC-27t 차례마다 두 낱말 목록의 쌍을 같은 일치 비율로 맞댄다(고르기 답 표지 넣은 값 · 뺀 값)", () => {
    const pairs = [
      ...chatTurnPairsOf({ a: ["beach", "swim"], b: ["beach"], choice: [] }),
      ...chatTurnPairsOf({ a: ["sea"], b: [], choice: ["sea"] }),
      ...chatTurnPairsOf({ a: [], b: [], choice: [] }),
    ];
    expect(pairs).toEqual([
      { word: "beach", a: true, b: true, choice: false },
      { word: "swim", a: true, b: false, choice: false },
      { word: "sea", a: true, b: false, choice: true },
    ]);
    expect(chatAgreementOf(pairs)).toEqual({
      withChoice: { pairs: 3, agreed: 1, ratio: 1 / 3 },
      withoutChoice: { pairs: 2, agreed: 1, ratio: 0.5 },
    });
  });

  it("AC-27t chat-compare 는 DB · 서버 모듈을 가져오지 않는 순수 모듈이다", () => {
    const source = readFileSync(
      join(process.cwd(), "src/core/conversation/chat-compare.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/from "@\/(server|db)\/|drizzle-orm/);
  });
});

describe("fix 1 — 까닭 표지와 행에서 비교까지(M-3 · M-5)", () => {
  it("AC-27i 앱이 아는 막힘 말 속의 단원 낱말은 까닭 표지 app_stuck 을 받는다", () => {
    const summary = chatCompareOf({
      rows: [
        {
          row: 1,
          judge: judge({
            app: [{ word: "swim", category: "own_sentence", accepted: false }],
            legacy: ["swim"],
            appStuck: true,
          }),
        },
      ],
      met: [],
      source: "real",
      homophones: [],
    });
    expect(summary.oneSide).toEqual([
      {
        row: 1,
        word: "swim",
        side: "legacy_only",
        category: "own_sentence",
        reasons: ["app_stuck"],
      },
    ]);
  });

  const HOMOPHONES = HomophonesFileSchema.parse(
    JSON.parse(
      readFileSync(join(process.cwd(), "seed/lists/homophones.json"), "utf8"),
    ),
  ).groups;
  const VOCAB = [
    { word: "eat", forms: ["eats", "ate", "eaten", "eating"] },
    { word: "drink", forms: ["drinks", "drank", "drinking"] },
    { word: "go", forms: ["goes", "went", "gone", "going"] },
    { word: "sea", forms: ["seas"] },
    { word: "mountain", forms: ["mountains"] },
    { word: "beach", forms: ["beaches"] },
  ];
  const ctx = {
    unitWords: VOCAB.map((v) => v.word),
    lemmaOf: lemmaLookup(VOCAB),
    homophones: HOMOPHONES,
    sceneWords: new Set(["beach", "sea", "mountain"]),
    spec: { band: "1-3" as const },
    teacherName: "Mina",
  };
  const t = (say: string): ChatJudgeRow => ({
    role: "teacher",
    say,
    listenSentence: null,
    explainShown: false,
    closing: false,
    first: false,
  });
  const c = (
    heard: string,
    output: Partial<TalkChatEvalOutput>,
  ): ChatJudgeRow => ({
    role: "child",
    input: "speech",
    heard,
    opened: [],
    koHelp: null,
    eval: {
      status: "done",
      output: {
        reading: "clear_answer",
        teacher_move: "react_and_follow_up",
        model_sentence: "",
        child_used_on_own: [],
        ...output,
      },
    },
  });

  it("AC-27i 합성 수업: 행 → chatJudgesOf → chatCompareOf 에서 같은 소리 고르기 답 · 되물은 뒤의 답 · 보류 문장 답이 갈래와 까닭을 빠짐없이 받는다", () => {
    const rows: ChatJudgeRow[] = [
      t("Do you like the sea or the mountain?"),
      c("See.", { child_used_on_own: ["sea"] }),
      t("Me too! On weekends, I go to the mountain."),
      c("Mountain sky", {
        reading: "likely_misheard",
        teacher_move: "ask_again",
      }),
      t("Sorry, say it again, please!"),
      c("Mountain.", { child_used_on_own: [] }),
      t("Fun! Do you go to the beach?"),
      c("Yes, I go to the beach.", { child_used_on_own: ["go", "beach"] }),
      t("Nice!"),
    ];
    const summary = chatCompareOf({
      rows: chatJudgesOf(rows, ctx),
      met: [],
      source: "mock",
      homophones: [],
    });
    expect(summary.oneSide).toEqual([
      {
        row: 1,
        word: "sea",
        side: "legacy_only",
        category: "echoed_word",
        reasons: ["choice_answer"],
      },
      {
        row: 3,
        word: "mountain",
        side: "app_only",
        category: "own_sentence",
        reasons: ["ask_again_unknown"],
      },
      {
        row: 5,
        word: "mountain",
        side: "app_only",
        category: "own_sentence",
        reasons: ["ask_again_unknown"],
      },
      {
        row: 7,
        word: "go",
        side: "legacy_only",
        category: "echoed_word",
        reasons: [],
      },
      {
        row: 7,
        word: "beach",
        side: "legacy_only",
        category: "echoed_word",
        reasons: [],
      },
    ]);
    expect(summary.agreement).toEqual({
      withChoice: { pairs: 5, agreed: 0, ratio: 0 },
      withoutChoice: { pairs: 4, agreed: 0, ratio: 0 },
    });
  });
});

describe("fix 2 — 단원에 같은 소리 낱말이 함께 있을 때의 비교(N-3)", () => {
  const HOMOPHONES = HomophonesFileSchema.parse(
    JSON.parse(
      readFileSync(join(process.cwd(), "seed/lists/homophones.json"), "utf8"),
    ),
  ).groups;
  const VOCAB = [
    { word: "see", forms: ["sees", "saw", "seen", "seeing"] },
    { word: "sea", forms: ["seas"] },
    { word: "mountain", forms: ["mountains"] },
  ];
  const ctx = {
    unitWords: VOCAB.map((v) => v.word),
    lemmaOf: lemmaLookup(VOCAB),
    homophones: HOMOPHONES,
    sceneWords: new Set(["sea", "mountain"]),
    spec: { band: "1-3" as const },
    teacherName: "Mina",
  };

  it("AC-27i 고르기 물음 뒤 'See.'(앱 낱말 see · 기존 꼴 sea)의 쌍이 같은 소리 대표 낱말로 갈래와 고르기 답 표지를 찾는다", () => {
    const rows: ChatJudgeRow[] = [
      {
        role: "teacher",
        say: "Do you like the sea or the mountain?",
        listenSentence: null,
        explainShown: false,
        closing: false,
        first: false,
      },
      {
        role: "child",
        input: "speech",
        heard: "See.",
        opened: [],
        koHelp: null,
        eval: {
          status: "done",
          output: {
            reading: "clear_answer",
            teacher_move: "react_and_follow_up",
            model_sentence: "",
            child_used_on_own: ["sea"],
          },
        },
      },
    ];
    const summary = chatCompareOf({
      rows: chatJudgesOf(rows, ctx),
      met: [],
      source: "real",
      homophones: HOMOPHONES,
    });
    expect(summary.oneSide).toEqual([
      {
        row: 1,
        word: "sea",
        side: "legacy_only",
        category: "echoed_word",
        reasons: ["choice_answer"],
      },
    ]);
    expect(summary.agreement.withoutChoice).toEqual({
      pairs: 0,
      agreed: 0,
      ratio: null,
    });
  });
});

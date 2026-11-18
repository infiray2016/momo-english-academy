// 수업 안 한국어로 묻기 묶음 K — 이야기 방식에 잇기(이야기 방식 spec FR-13 · 설계 12 · AC-13(정본 AC-27m), 한국어 plan '다시 맞춤' K 줄 · 13절 C243 (5)).
// 사실 줄(가르친 표현은 목록 — 여럿이면 'A'; 'B'), 판정 행의 한국어 도움(앱 판정 '도움받은 상황' · 기록 전용 두 판정의 '말했다' 거름), 한국어로 묻지 않은
// 차례는 그대로임을 본다. DB · AI 없음.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { TalkChatEvalOutput } from "@/core/ai/calls/talk-chat-eval";
import {
  chatAiQuestionOf,
  chatOpenedHintTextsOf,
} from "@/core/conversation/chat-hints";
import {
  type ChatJudgeChildRow,
  type ChatJudgeContext,
  type ChatJudgeRow,
  chatJudgesOf,
} from "@/core/conversation/chat-judge";
import {
  chatFactLineOf,
  chatUserMessageOf,
} from "@/core/conversation/chat-message";
import {
  type ChatTurnRowLike,
  chatJudgeRowsOf,
  chatKoJudgeOf,
  koHelpRowsWithDeviceOf,
} from "@/core/conversation/chat-rows";
import { chatFactsOf, chatKoHelpOf } from "@/core/conversation/chat-turn-core";
import {
  type KoHelpStandingRow,
  koHelpLineText,
  koHelpStandingOf,
} from "@/core/conversation/ko-help";
import { HomophonesFileSchema } from "@/core/seed/schema/reference";
import { lemmaLookup } from "@/core/session/attempt";

const HOMOPHONES = HomophonesFileSchema.parse(
  JSON.parse(
    readFileSync(join(process.cwd(), "seed/lists/homophones.json"), "utf8"),
  ),
).groups;
const VOCAB = [
  { word: "like", forms: ["likes", "liked", "liking"] },
  { word: "gimbap", forms: [] },
  { word: "drink", forms: ["drinks", "drank", "drinking"] },
  { word: "milk", forms: [] },
  { word: "water", forms: [] },
];
const CTX: ChatJudgeContext = {
  unitWords: VOCAB.map((v) => v.word),
  lemmaOf: lemmaLookup(VOCAB),
  homophones: HOMOPHONES,
  sceneWords: new Set(["lunch"]),
  spec: { band: "1-3" },
  teacherName: "Mina",
};

/** 답을 채운 도움 행(talk_ko_helps 의 대접 칸). */
function help(extra: Partial<KoHelpStandingRow> = {}): KoHelpStandingRow {
  return {
    turnNo: 3,
    seq: 1,
    kind: "expression",
    sayKo: "김밥이 좋다고 말하고 싶구나. 이렇게 말해 봐.",
    teachEn: "I like gimbap.",
    textShown: false,
    fallback: "none",
    shownEn: null,
    heard: null,
    ...extra,
  };
}

const DONE: TalkChatEvalOutput = {
  reading: "clear_answer",
  teacher_move: "react_and_follow_up",
  model_sentence: "",
  child_used_on_own: ["drink", "milk"],
};

function teacherJ(say: string): ChatJudgeRow {
  return {
    role: "teacher",
    say,
    listenSentence: null,
    explainShown: false,
    closing: false,
    first: false,
  };
}

function childJ(
  heard: string,
  extra: Partial<Omit<ChatJudgeChildRow, "role" | "heard">> = {},
): ChatJudgeChildRow {
  return {
    role: "child",
    input: "speech",
    heard,
    opened: [],
    koHelp: null,
    eval: { status: "done", output: DONE },
    ...extra,
  };
}

/** talk_turns 행 흉내(대화 토막). */
function row(
  speaker: "child" | "tori",
  turnNo: number,
  text: string,
): ChatTurnRowLike {
  return {
    id: `${speaker}-${turnNo}`,
    turnNo,
    segment: "talk",
    speaker,
    text,
    inputMode: speaker === "child" ? "speech" : null,
    hintLevel: speaker === "child" ? 0 : null,
    clientListen: null,
    sentUserMessage: null,
    toriRewrite: null,
    aiQuestion: null,
    move: null,
    chatJudge: null,
  };
}

const ROWS: ChatTurnRowLike[] = [
  row("tori", 2, "I love lunch time."),
  row("child", 2, "Yes."),
  row("tori", 3, "Mina likes rice. What do you like?"),
  row("child", 3, "I like gimbap."),
  row("tori", 4, "Gimbap is yummy!"),
];

describe("묶음 K 사실 줄 — 가르친 표현은 목록(AC-13 · AC-27m)", () => {
  it("AC-27m 가르친 표현 여럿은 'A'; 'B' 로 적고 기존 방식의 한 줄(koHelpLineText)과 글자까지 같다", () => {
    const taught = ["I like gimbap.", "It is yummy."];
    expect(chatFactLineOf({ kind: "ko_help", taught })).toBe(
      "Korean help before this answer: taught 'I like gimbap.'; 'It is yummy.'",
    );
    expect(chatFactLineOf({ kind: "ko_help", taught })).toBe(
      koHelpLineText({ kind: "taught", taught }),
    );
    expect(chatFactLineOf({ kind: "ko_help", taught: [] })).toBe(
      koHelpLineText({ kind: "meaning" }),
    );
    expect(chatFactLineOf({ kind: "ko_help", taught: [" ", ""] })).toBe(
      "Korean help before this answer: meaning only",
    );
  });

  it("AC-27m 대접(koHelpStandingOf)의 한 줄이 사실이 된다: 표현 → taught 목록, 뜻만 → meaning only, 줄 없음 → 사실 없음", () => {
    const taught = koHelpStandingOf([help()], { lowBand: true });
    expect(chatKoHelpOf(taught)).toEqual({ taught: ["I like gimbap."] });
    const meaning = koHelpStandingOf(
      [help({ kind: "meaning", teachEn: null })],
      { lowBand: true },
    );
    expect(chatKoHelpOf(meaning)).toEqual({ taught: null });
    // 답이 없는 행 · 대신 줄 · 1~3단계에서 들려주지 못한 표현은 도움 없음이라 줄이 없다
    for (const rows of [
      [help({ sayKo: null, fallback: null })],
      [help({ fallback: "call_failed" })],
      [help({ fallback: "check_blocked" })],
      [help({ heard: false })],
    ])
      expect(chatKoHelpOf(koHelpStandingOf(rows, { lowBand: true }))).toBe(
        null,
      );
    expect(chatKoHelpOf(null)).toBe(null);
  });

  it("AC-27m 한국어 도움 줄은 다른 사실 줄의 맨 뒤, 입력 줄 바로 앞이다(마무리 차례와 겹쳐도)", () => {
    const facts = chatFactsOf({
      greetingEnd: false,
      prepOpens: false,
      closing: true,
      lastTurn: false,
      koHelp: chatKoHelpOf(koHelpStandingOf([help()], { lowBand: true })),
    });
    const lines = chatUserMessageOf({
      facts,
      input: { kind: "speech", heard: "I like gimbap." },
    }).split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatch(/^This is the closing turn\./);
    expect(lines[1]).toBe(
      "Korean help before this answer: taught 'I like gimbap.'",
    );
    expect(lines[2]).toContain("I like gimbap.");
  });
});

describe("묶음 K 판정 행 — 도움받은 상황 · '말했다' 거름(AC-13)", () => {
  it("AC-27m 도움 행이 없으면 판정 행은 넘기지 않은 때와 같다(한국어로 묻지 않은 턴은 그대로)", () => {
    expect(chatJudgeRowsOf(ROWS, CTX.spec, undefined, [])).toEqual(
      chatJudgeRowsOf(ROWS, CTX.spec),
    );
    // 다른 턴 번호의 도움 행은 이 아이 행에 붙지 않는다(되묻는 차례 뒤 이어받기를 걸지 않음)
    const other = chatJudgeRowsOf(ROWS, CTX.spec, undefined, [
      help({ turnNo: 2 }),
    ]);
    expect(other.rows[3]).toEqual(chatJudgeRowsOf(ROWS, CTX.spec).rows[3]);
  });

  it("AC-27m 도움 뒤 아이 행에 한국어 도움(가르친 표현 목록 · 힌트 종류)을 싣고, 답이 없는 행 · 대신 줄은 싣지 않는다", () => {
    const judged = chatJudgeRowsOf(ROWS, CTX.spec, undefined, [help()]);
    const child = judged.rows[3];
    expect(child).toMatchObject({
      role: "child",
      koHelp: { taught: ["I like gimbap."], hintKind: "english" },
    });
    for (const h of [
      help({ sayKo: null, fallback: null }),
      help({ fallback: "call_failed" }),
    ])
      expect(
        chatJudgeRowsOf(ROWS, CTX.spec, undefined, [h]).rows[3],
      ).toMatchObject({ koHelp: null });
  });

  it("AC-27m 기기 값(들려주지 못함)은 같은 턴 번호 · 순번 행의 값보다 앞선다(koHelpRowsWithDeviceOf)", () => {
    const rows = koHelpRowsWithDeviceOf(
      [help(), help({ seq: 2 })],
      [{ turnNo: 3, seq: 1, heard: false }],
    );
    expect(rows.map((r) => r.heard)).toEqual([false, null]);
    expect(koHelpRowsWithDeviceOf([help()], [])).toEqual([help()]);
  });

  it("AC-27m 앱 판정: 영어를 알려 준 한국어 도움은 '도움받은 상황'이고 인정하지 않으며, 기존 꼴 판정의 힌트 종류도 '영어'다", () => {
    const ko = chatKoJudgeOf(koHelpStandingOf([help()], { lowBand: true }));
    const [j] = chatJudgesOf(
      [teacherJ("What do you like?"), childJ("I like gimbap.", ko)],
      CTX,
    ).map((x) => x.judge);
    expect(j?.app.hintKind).toBe("english");
    expect(j?.app.words.map((w) => [w.word, w.category, w.accepted])).toEqual([
      ["like", "helped", false],
      ["gimbap", "helped", false],
    ]);
    expect(j?.app.said).toEqual([]);
    expect(j?.legacy.help?.hintKind).toBe("english");
    expect(j?.legacy.said).toEqual([]);
  });

  it("AC-27m 대접의 힌트 종류를 따른다: 표현 칸이 비어도 '영어'로 대접한 도움은 '영어'(묶음 4-다 의 순수 함수 그대로)", () => {
    const [j] = chatJudgesOf(
      [
        teacherJ("What do you like?"),
        childJ("I drink milk.", {
          koHelp: { taught: [], hintKind: "english" },
        }),
      ],
      CTX,
    ).map((x) => x.judge);
    expect(j?.app.hintKind).toBe("english");
    expect(j?.app.said).toEqual([]);
  });

  it("AC-27m '말했다' 거름: 뜻만 받은 도움이 글로 보인 낱말(milk)은 두 판정의 said 에서 빠지고, 갈래 기록 · 다른 낱말은 그대로다", () => {
    const say = "What do you drink?";
    const plain = chatJudgesOf(
      [teacherJ(say), childJ("I drink milk.", { koHelp: { taught: null } })],
      CTX,
    ).map((x) => x.judge)[0];
    expect(plain?.app.said).toEqual(["drink", "milk"]);
    expect(plain?.legacy.said).toEqual(["drink", "milk"]);
    const ko = chatKoJudgeOf(
      koHelpStandingOf(
        [
          help({
            kind: "meaning",
            teachEn: null,
            sayKo: "milk 는 우유라는 뜻이야.",
            shownEn: ["milk"],
          }),
        ],
        { lowBand: true },
      ),
    );
    expect(ko).toEqual({
      koHelp: { taught: null, hintKind: "meaning_only" },
      koShownWords: ["milk"],
    });
    const [j] = chatJudgesOf(
      [teacherJ(say), childJ("I drink milk.", ko)],
      CTX,
    ).map((x) => x.judge);
    expect(j?.app.words.map((w) => [w.word, w.category, w.accepted])).toEqual([
      ["drink", "helped", true],
      ["milk", "helped", true],
    ]);
    expect(j?.app.said).toEqual(["drink"]);
    expect(j?.legacy.said).toEqual(["drink"]);
  });

  it("AC-27m 도움이 없는 행의 판정 재료는 빈 값이다(chatKoJudgeOf(null) — 칸을 더하지 않음)", () => {
    expect(chatKoJudgeOf(null)).toEqual({ koHelp: null });
    const none = koHelpStandingOf([help({ fallback: "call_failed" })], {
      lowBand: true,
    });
    expect(chatKoJudgeOf(none)).toEqual({ koHelp: null });
  });
});

describe("묶음 K 한국어 도움 호출의 연 힌트 글(chatOpenedHintTextsOf)", () => {
  const stored = chatAiQuestionOf({
    tiers: [
      { kind: "ko", text: "좋아하는 음식을 말해 봐." },
      { kind: "sentence", text: "I like gimbap." },
    ],
    explainKo: "",
  });

  it("AC-27m 힌트 받는 서버 액션이 저장한 단 가운데 연 만큼의 글을 차례대로 싣는다", () => {
    expect(chatOpenedHintTextsOf(stored, { band: "1-3" }, 1)).toEqual([
      "좋아하는 음식을 말해 봐.",
    ]);
    expect(chatOpenedHintTextsOf(stored, { band: "1-3" }, 5)).toEqual([
      "좋아하는 음식을 말해 봐.",
      "I like gimbap.",
    ]);
  });

  it("AC-27m 연 단이 없거나 저장된 단이 없으면 빈 목록 그대로다", () => {
    expect(chatOpenedHintTextsOf(stored, { band: "1-3" }, 0)).toEqual([]);
    expect(chatOpenedHintTextsOf(null, { band: "1-3" }, 2)).toEqual([]);
    expect(
      chatOpenedHintTextsOf(
        { en: "Hi", ko: "", hints: [] },
        { band: "1-3" },
        2,
      ),
    ).toEqual([]);
  });
});

// 회화 '말했다' · '안다' · 만남 · 단원 단어 조건 · 영어로 말한 문장 · 친한 정도 · 회화 시도 꼴(plan-p13a 파일별 값 9 · 12 · 13,
// 3.4 · 3.5 · C41 · C89 · C95). 설계 숫자는 시험용 설정 · 작은 틀 설정에서 읽는다. 동음이의어는 시드 목록 그대로.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  followAlongNo,
  parseTalkAttemptInput,
  TALK_CLOSING_ACTIVITY_NO,
  TALK_START_ACTIVITY_NO,
  talkClosingAttemptId,
  talkStartAttemptId,
} from "@/core/conversation/attempt";
import { friendshipAfter } from "@/core/conversation/friendship";
import {
  countsAsSaid,
  metWordsIn,
  type SaidHintKind,
  s3WordCountOf,
  saidWordsOf,
  sayStateAfter,
  talkEnglishSentenceDelta,
  talkWordConditionOf,
} from "@/core/conversation/said";
import { HomophonesFileSchema } from "@/core/seed/schema/reference";
import { STORIES_PER_BAND } from "@/core/seed/structure";
import { lemmaLookup } from "@/core/session/attempt";
import { loadableSettings } from "../fixtures/seed/loadable";
import { testSettingValues } from "../fixtures/settings";

const values = testSettingValues();
const loadable = new Map(
  loadableSettings().settings.map((row) => [row.key, row.value]),
);
const HOMOPHONES = HomophonesFileSchema.parse(
  JSON.parse(
    readFileSync(join(process.cwd(), "seed/lists/homophones.json"), "utf8"),
  ),
).groups;
const VOCAB = [
  { word: "go", forms: ["goes", "went", "gone", "going"] },
  { word: "park", forms: ["parks"] },
  { word: "two", forms: [] },
  { word: "dog", forms: ["dogs"] },
  { word: "apple", forms: ["apples"] },
  { word: "red", forms: [] },
];
const UNIT_WORDS = VOCAB.map((v) => v.word);
const lemmaOf = lemmaLookup(VOCAB);
const said = (
  aiWords: string[],
  heard: string,
  hintKind: SaidHintKind = "none",
) =>
  saidWordsOf({
    aiWords,
    heard,
    hintKind,
    unitWords: UNIT_WORDS,
    lemmaOf,
    homophones: HOMOPHONES,
  });

describe("회화 '말했다' · '안다'(3.4)", () => {
  it("AC-9d '말했다'는 AI 가 돌려준 단원 단어 가운데 힌트 종류가 '뜻만' · '없음'이고 인식 글에 원형으로 든 것만 센다", () => {
    expect(said(["apple", "red"], "I like red apples", "none")).toEqual([
      "apple",
      "red",
    ]);
    expect(said(["apples"], "I like red apples", "meaning_only")).toEqual([
      "apple",
    ]);
    expect(said(["apple", "red"], "I like red apples", "english")).toEqual([]);
    // 인식 글에 없는 단어 · 단원 단어가 아닌 단어는 세지 않는다
    expect(said(["dog", "banana"], "I like red apples")).toEqual([]);
  });

  it("AC-9d 인식 글 'I went to the park' 에서 AI 가 돌려준 go 는 센다", () => {
    expect(said(["go", "park"], "I went to the park")).toEqual(["go", "park"]);
  });

  it("AC-9d 'two dogs' 가 'to dogs' 로 인식되어도 two 로 센다", () => {
    expect(said(["two", "dog"], "to dogs")).toEqual(["two", "dog"]);
    expect(said(["two"], "I have 2 dogs")).toEqual(["two"]);
  });

  it("AC-9d 같은 학습일에 두 번 말한 단어는 '안다'가 아니고 서로 다른 학습일에 두 번이면 '안다'다", () => {
    const knownDays = Number(loadable.get("talk.known_days"));
    expect(knownDays).toBeGreaterThan(1);
    const day1 = "2026-10-20";
    const day2 = "2026-10-21";
    let state = sayStateAfter({ saidDays: [], day: day1, knownDays });
    state = sayStateAfter({ saidDays: state.saidDays, day: day1, knownDays });
    expect(state).toEqual({ saidDays: [day1], known: false });
    const days = [day1];
    for (let i = 1; i < knownDays; i++) days.push(`2026-10-2${i}`);
    let many = { saidDays: [] as string[], known: false };
    for (const day of days)
      many = sayStateAfter({ saidDays: many.saidDays, day, knownDays });
    expect(many.known).toBe(true);
    expect(
      sayStateAfter({ saidDays: [day2], day: day1, knownDays }).saidDays,
    ).toEqual([day1, day2]);
  });

  it("AC-9d 답 두 개나 답 예시를 들은 턴과 오늘 쓸 말 · 다시 하기 · 중단된 대화의 턴 처리: 앞의 둘은 세지 않고 뒤의 둘은 센다", () => {
    // 답 두 개 · 답 예시를 들은 턴은 힌트 종류가 '영어'다(hints.ts) — 세지 않는다
    expect(said(["apple"], "I like apples", "english")).toEqual([]);
    // 오늘 쓸 말의 따라 말하기는 세지 않는다
    expect(
      countsAsSaid({ source: "today_words", sessionKind: "regular" }),
    ).toBe(false);
    // 다시 하기 · 중단된 대화의 회화 턴은 센다
    expect(countsAsSaid({ source: "turn", sessionKind: "retry" })).toBe(true);
    expect(countsAsSaid({ source: "turn", sessionKind: "aborted" })).toBe(true);
    expect(countsAsSaid({ source: "turn", sessionKind: "regular" })).toBe(true);
  });

  it("AC-15n 오늘 쓸 말 · 말해 보기 · 정리의 따라 말하기는 '말했다'에 들지 않는다", () => {
    for (const source of [
      "today_words",
      "practice",
      "wrap_up",
      "again",
    ] as const)
      expect(countsAsSaid({ source, sessionKind: "regular" }), source).toBe(
        false,
      );
  });

  it("회화 만남: 토리 말 · 카드 질문 · 오늘 쓸 말에서 단원 단어를 원형까지 맞춰 찾고 동음이의어는 맞추지 않는다(C99)", () => {
    const lex = { unitWords: UNIT_WORDS, lemmaOf };
    expect(
      metWordsIn("Two apples! Do you like the park? I went there.", lex),
    ).toEqual(["two", "apple", "park", "go"]);
    expect(metWordsIn("I have 2 dogs.", lex)).toEqual(["two", "dog"]);
    // 기능어 to · too 는 단원 단어 two 를 '만남'으로 만들지 않는다 — '말했다'(아이 인식 글)만 동음이의어를 맞춘다
    expect(metWordsIn("I see it too. I want to go.", lex)).toEqual(["go"]);
    expect(said(["two"], "to dogs")).toEqual(["two"]);
  });
});

describe("회화 단원 단어 조건 · 셈", () => {
  it("AC-15c 단원 단어 30개 가운데 '말함' '안다'가 24개면 회화 단원 통과의 단어 조건을 채우고 23개면 채우지 못한다", () => {
    const ratio = Number(loadable.get("talk.said_ratio"));
    const unitWords = Array.from({ length: 30 }, (_, i) => `w${i}`);
    const pass = Math.ceil(unitWords.length * ratio);
    expect(pass).toBe(24);
    expect(
      talkWordConditionOf({
        knownSay: unitWords.slice(0, pass),
        unitWords,
        ratio,
      }),
    ).toEqual({ ok: true, known: pass, total: 30 });
    expect(
      talkWordConditionOf({
        knownSay: unitWords.slice(0, pass - 1),
        unitWords,
        ratio,
      }).ok,
    ).toBe(false);
    // 단원 밖 단어 · 겹친 단어는 세지 않는다
    expect(
      talkWordConditionOf({
        knownSay: [...unitWords.slice(0, pass - 1), "w0", "other"],
        unitWords,
        ratio,
      }).known,
    ).toBe(pass - 1);
    expect(talkWordConditionOf({ knownSay: [], unitWords: [], ratio }).ok).toBe(
      false,
    );
  });

  it("AC-15c S-3 단어 수는 힌트 종류가 '영어'인 턴을 빼고 센다", () => {
    expect(
      s3WordCountOf([
        { hintKind: "none", wordCount: 4 },
        { hintKind: "meaning_only", wordCount: 3 },
        { hintKind: "english", wordCount: 5 },
        { hintKind: "none", wordCount: null },
      ]),
    ).toBe(7);
  });

  it("영어로 말한 문장 수(회화): 인식 글이 있는 '말' 턴과 따라 말하기마다 하나이고 '모름' 턴은 세지 않는다", () => {
    expect(talkEnglishSentenceDelta("speech", "I like apples")).toBe(1);
    expect(talkEnglishSentenceDelta("follow", "apple")).toBe(1);
    expect(talkEnglishSentenceDelta("again", "Two apples, please.")).toBe(1);
    expect(talkEnglishSentenceDelta("dont_know", "")).toBe(0);
    expect(talkEnglishSentenceDelta("dont_know", "what")).toBe(0);
    expect(talkEnglishSentenceDelta("speech", "   ")).toBe(0);
    expect(talkEnglishSentenceDelta("follow", "")).toBe(0);
  });
});

describe("토리와 친한 정도(3.5)", () => {
  const rules = {
    per: values["talk.friendship_per_talk"] as number,
    max: values["talk.friendship_max"] as number,
  };
  const base = {
    friendship: 0,
    opened: 0,
    storiesInBand: STORIES_PER_BAND,
    isRetry: false,
  };

  it("AC-16a 새 대화를 목표 턴까지 하면 친한 정도가 1칸 오르고 10칸이 차면 지금 구간의 다음 토리 이야기가 열린 뒤 0칸으로 돌아간다", () => {
    expect(friendshipAfter(base, rules)).toEqual({
      friendship: rules.per,
      opened: 0,
      unlocked: null,
    });
    expect(
      friendshipAfter(
        { ...base, friendship: rules.max - rules.per, opened: 3 },
        rules,
      ),
    ).toEqual({ friendship: 0, opened: 4, unlocked: 4 });
  });

  it("AC-16a 구간 이야기 20장을 다 열면 칸이 10에서 멈추고 다음 구간에 들어가면 그 구간 첫 이야기부터 연다", () => {
    const full = { ...base, opened: STORIES_PER_BAND };
    expect(
      friendshipAfter({ ...full, friendship: rules.max - rules.per }, rules),
    ).toEqual({
      friendship: rules.max,
      opened: STORIES_PER_BAND,
      unlocked: null,
    });
    expect(friendshipAfter({ ...full, friendship: rules.max }, rules)).toEqual({
      friendship: rules.max,
      opened: STORIES_PER_BAND,
      unlocked: null,
    });
    // 다음 구간(그 구간 연 수 0): 멈춰 있던 10칸은 0칸부터 다시 오르고, 다음에 10칸이 차면 첫 이야기
    const next = friendshipAfter(
      { ...base, friendship: rules.max, opened: 0 },
      rules,
    );
    expect(next).toEqual({ friendship: rules.per, opened: 0, unlocked: null });
    expect(
      friendshipAfter(
        { ...base, friendship: rules.max - rules.per, opened: 0 },
        rules,
      ),
    ).toEqual({ friendship: 0, opened: 1, unlocked: 1 });
  });

  it("AC-16a 칸이 7일 때 구간이 바뀌면 7이 그대로 남고 다시 하기로는 오르지 않는다", () => {
    expect(
      friendshipAfter({ ...base, friendship: 7, opened: 0 }, rules),
    ).toEqual({
      friendship: 7 + rules.per,
      opened: 0,
      unlocked: null,
    });
    expect(
      friendshipAfter(
        { ...base, friendship: 7, opened: 2, isRetry: true },
        rules,
      ),
    ).toEqual({ friendship: 7, opened: 2, unlocked: null });
  });
});

describe("회화 시도 꼴(attempts)", () => {
  const sessionId = "00000000-0000-4000-8000-000000000001";

  it("회화 시도: 처음 스냅숏 · 따라 말하기 · 한 번 더 말해 보기 꼴을 받고 다른 꼴은 거부한다", () => {
    expect(talkStartAttemptId(sessionId)).toBe(`talk-start:${sessionId}`);
    expect(talkClosingAttemptId(sessionId)).toBe(`talk-closing:${sessionId}`);
    expect(TALK_START_ACTIVITY_NO).toBe(1);
    expect(TALK_CLOSING_ACTIVITY_NO).toBe(0);
    const start = {
      v: 1,
      kind: "talk-start",
      step: "final",
      shownWords: ["apple"],
      metBefore: [],
      practiceOrder: [[0], [0]],
    };
    expect(parseTalkAttemptInput(start)).toEqual(start);
    const spoken = {
      v: 1,
      step: "final",
      target: "apple",
      heard: ["apple"],
      failures: 0,
    };
    for (const extra of [
      { kind: "talk-today", index: 0 },
      { kind: "talk-practice", index: 0, round: 1 },
      { kind: "talk-wrapup", index: 0 },
      { kind: "talk-again" },
      { kind: "talk-today", index: 0, skipped: "recognition" },
    ])
      expect(
        parseTalkAttemptInput({ ...spoken, ...extra }),
        extra.kind,
      ).toBeDefined();
    expect(
      parseTalkAttemptInput({ ...spoken, kind: "talk-practice", index: 0 }),
    ).toBeUndefined();
    expect(
      parseTalkAttemptInput({ ...spoken, kind: "preview" }),
    ).toBeUndefined();
    expect(
      parseTalkAttemptInput({
        ...spoken,
        kind: "talk-today",
        index: 0,
        score: 1,
      }),
    ).toBeUndefined();
  });

  it("회화 시도: 활동 번호는 처음 스냅숏 1 뒤로 오늘 쓸 말 → 말해 보기 바퀴마다 → 정리 → 한 번 더 말해 보기 차례다", () => {
    const counts = {
      todayWords: 3,
      practiceItems: 2,
      practiceRounds: 2,
      wrapUp: 3,
    };
    expect(followAlongNo({ segment: "today_words", index: 0 }, counts)).toBe(2);
    expect(followAlongNo({ segment: "today_words", index: 2 }, counts)).toBe(4);
    expect(
      followAlongNo({ segment: "practice", index: 0, round: 0 }, counts),
    ).toBe(5);
    expect(
      followAlongNo({ segment: "practice", index: 1, round: 1 }, counts),
    ).toBe(8);
    expect(followAlongNo({ segment: "wrap_up", index: 0 }, counts)).toBe(9);
    expect(followAlongNo({ segment: "again", index: 0 }, counts)).toBe(12);
    expect(() =>
      followAlongNo({ segment: "today_words", index: 3 }, counts),
    ).toThrow();
    expect(() =>
      followAlongNo({ segment: "practice", index: 0, round: 2 }, counts),
    ).toThrow();
  });
});

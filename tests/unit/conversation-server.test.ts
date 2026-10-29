// 회화 세션 서버의 DB 없는 몫(plan-p13b 파일별 값 1 · 2 · 3 — 토리 행 원문 꼴 · 가벼운 꼴 네 칸 유도(a 보고 '요청 2') · 흘려 보낼 줄 ·
// 1~3단계 서버 자료에서 아이가 말할 영어 빼기 · 결과마다 토리 행(8절 회화 턴 실패) · 아이 행 칸 · 끝맺음 상태 · 앞 턴 짝).
// 통합 시험(tests/integration/conversation-{session,turn}.test.ts)은 CI 가 돈다 — 이 파일은 같은 길의 순수 몫을 로컬에서 본다.
// 설계 숫자는 시험용 설정 · 견본 빌더(작은 틀)에서 읽는다.
import { describe, expect, it } from "vitest";
import type { TalkOutput } from "@/core/ai/calls/talk";
import type { Masker } from "@/core/ai/mask";
import {
  parseTalkAttemptInput,
  TALK_CLOSING_REASONS,
} from "@/core/conversation/attempt";
import type { ClientListen } from "@/core/conversation/client-listen";
import {
  MORE_PROMPT,
  praiseLineOf,
  type TalkFlowSettings,
  type TalkTurnLite,
  talkFlowSettingsFrom,
  talkPositionOf,
} from "@/core/conversation/flow";
import { safeLineOf } from "@/core/conversation/stream";
import type { TalkLevelSpec } from "@/core/seed/schema/reference";
import type { TalkCard } from "@/core/seed/schema/talk";
import { lemmaLookup } from "@/core/session/attempt";
import type { TalkOutcome } from "@/server/ai";
import {
  CLOSING_FAILURES_TO_GIVE_UP,
  closingStateOf,
  nextClosingState,
} from "@/server/conversation/closing";
import {
  addLinesOf,
  appendLinesFromText,
  hintViewsOf,
  historyOf,
  liteOf,
  moreChosenOf,
  moreTalkFallbackOf,
  openingLineOf,
  pendingViewOf,
  sortTurns,
  splitOrphan,
  type TalkTurnRow,
  talkContextAt,
  toriLinesOf,
  toriTextOf,
} from "@/server/conversation/state";
import {
  childRowOf,
  TALK_BREAK_LINE,
  type ToriPlanContext,
  toriPlanOf,
} from "@/server/conversation/turn";
import {
  type CellPlace,
  smallReferenceSet,
  talkCard,
} from "../fixtures/seed/builders";
import { testSettingValues } from "../fixtures/settings";

const values = testSettingValues();
const FLOW: TalkFlowSettings = talkFlowSettingsFrom((key) => values[key]);
const ref = smallReferenceSet();
const lemmaOf = lemmaLookup(ref.vocab.vocab);

function specOf(level: number): TalkLevelSpec {
  const spec = ref.levelSpecs.levelSpecs.find(
    (s) => s.area === "talk" && s.level === level,
  );
  if (spec?.area !== "talk") throw new Error(`회화 ${level}단계 규격 없음`);
  return spec;
}
function lessonAt(level: number, over: Partial<CellPlace> = {}) {
  return talkCard(ref, {
    level,
    unit: 1,
    kind: "assigned",
    lessonNo: 1,
    variant: 1,
    ...over,
  });
}

const tori = (
  over: Partial<Extract<TalkTurnLite, { speaker: "tori" }>> = {},
): TalkTurnLite => ({
  speaker: "tori",
  cardQuestionNo: null,
  moreTalkFallback: null,
  aiQuestion: null,
  moreChosen: false,
  ...over,
});
const kid = (
  segment: "greeting" | "talk" | "more_talk",
  targets: string[] = [],
): TalkTurnLite => ({
  speaker: "child",
  segment,
  input: "speech",
  stuck: false,
  targets,
});

let rowSeq = 0;
function row(over: Partial<TalkTurnRow>): TalkTurnRow {
  rowSeq += 1;
  return {
    id: `row-${rowSeq}`,
    sessionId: "s",
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
    recast: null,
    explanation: null,
    newWords: null,
    toriKo: null,
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
    recordedAt: new Date("2026-10-22T10:00:00Z"),
    ...over,
  };
}

function output(over: Partial<TalkOutput> = {}): TalkOutput {
  return {
    tori_en: "Nice!",
    tori_ko: "좋아!",
    recast: "",
    explanation: "",
    new_words: [],
    self_used_words: [],
    mission_done: [],
    stuck: false,
    card_question_no: 0,
    next_question_en: "",
    next_question_ko: "",
    next_hint_ko: "",
    next_hints: [],
    next_usable_phrases: [],
    next_targets: [],
    next_answer_example: "",
    farewell: "",
    farewell_ko: "",
    good_lines: [],
    next_time_lines: [],
    summary: "",
    ...over,
  };
}
function success(value: TalkOutput, sent: string[]): TalkOutcome {
  return {
    ok: true,
    value,
    sentSentences: sent,
    blocked: [],
    overLength: 0,
    firstSentenceMs: 1,
    answeredModel: "claude-haiku-5-5",
    normalized: false,
    checked: false,
    hintsBlocked: false,
    farewellBlocked: false,
    summaryBlocked: false,
    streamed: true,
    retriedOtherModel: false,
  };
}

/** 1단계: 인사를 마치고 대화 토막에 든 자리(토리 행 2 에 첫 대화 질문이 붙음). */
function lowCtx(
  card: TalkCard,
  lites: TalkTurnLite[],
  child: Partial<ToriPlanContext["child"]> = {},
  check?: (v: TalkOutput) => boolean,
): ToriPlanContext {
  return {
    state: {
      spec: specOf(1),
      card,
      start: { shownWords: [], metBefore: [], practiceOrder: [] },
      flowSettings: FLOW,
      segment: "talk",
      liveRows: [],
      lemmaOf,
      unitWords: card.turns?.flatMap((t) => t.targets) ?? [],
    },
    lites,
    child: {
      turnNo: 2,
      text: "I like it.",
      hintKind: "none",
      segment: "talk",
      inputMode: "speech",
      targetWords: [],
      ...child,
    },
    homophones: [],
    ...(check ? { checkAiQuestion: check } : {}),
  };
}

describe("토리 행 원문 · 가벼운 꼴 네 칸(a 보고 '요청 2')", () => {
  it("회화 서버: 토리 행 원문은 첫 줄이 검사를 지난 AI 글, 그 뒤 줄이 앱이 붙인 말이고 AI 글이 없으면 첫 줄이 빈다", () => {
    const text = toriTextOf("", ["How are you?", "I'm good. Or I'm fine."]);
    expect(toriLinesOf(text)).toEqual({
      aiPart: "",
      appended: ["How are you?", "I'm good. Or I'm fine."],
    });
    expect(toriLinesOf(toriTextOf("Nice! Great.", []))).toEqual({
      aiPart: "Nice! Great.",
      appended: [],
    });
  });

  it("회화 서버: moreChosen 은 1~3단계는 마지막 줄이 'Do you want to talk more?' 가 아니면, 4단계부터는 AI 글 뒤 붙인 줄이 그 말이 아닐 때만 참이다", () => {
    const low = specOf(1);
    const high = specOf(4);
    expect(moreChosenOf(toriTextOf("Nice!", [MORE_PROMPT.en]), low)).toBe(
      false,
    );
    expect(
      moreChosenOf(toriTextOf("Nice!", [MORE_PROMPT.en, "What color?"]), low),
    ).toBe(true);
    expect(moreChosenOf(toriTextOf(`Great. ${MORE_PROMPT.en}`, []), high)).toBe(
      false,
    );
    expect(
      moreChosenOf(toriTextOf("Great.", ["What do you want?"]), high),
    ).toBe(true);
    expect(moreChosenOf(toriTextOf("Great.", [MORE_PROMPT.en]), high)).toBe(
      false,
    );
  });

  it("회화 서버: moreTalkFallback 은 붙인 줄이 '더 이야기할 거리' 질문과 같을 때 그 차례이고 aiQuestion 은 ai_question 열의 꼴만 읽는다", () => {
    const card = lessonAt(1).card;
    const more = card.moreTalk ?? [];
    expect(more.length).toBeGreaterThan(1);
    const second = more[1]?.question.en ?? "";
    expect(moreTalkFallbackOf(toriTextOf("Good!", [second]), card)).toBe(1);
    expect(moreTalkFallbackOf(toriTextOf("Good!", ["Other?"]), card)).toBe(
      null,
    );
    const lite = liteOf(
      row({
        speaker: "tori",
        text: toriTextOf("Good!", ["What do you eat?"]),
        aiQuestion: {
          en: "What do you eat?",
          ko: "뭐 먹어?",
          answerExample: "I eat rice.",
          hintKo: "나는 밥을 먹어.",
          hints: ["I eat rice."],
        },
      }),
      { card, spec: specOf(1) },
    );
    expect(lite).toMatchObject({
      speaker: "tori",
      aiQuestion: { en: "What do you eat?", answerExample: "I eat rice." },
      moreChosen: true,
    });
    expect(
      liteOf(row({ speaker: "tori", aiQuestion: { en: "" } }), {
        card,
        spec: specOf(1),
      }),
    ).toMatchObject({ aiQuestion: null });
  });

  it("회화 서버: 아이 행의 막힘은 stuck_phrase 가 있는지로, 노린 단어는 target_words 로 읽는다", () => {
    const card = lessonAt(1).card;
    expect(
      liteOf(
        row({
          speaker: "child",
          segment: "more_talk",
          inputMode: "dont_know",
          stuckPhrase: "",
          targetWords: ["a"],
        }),
        { card, spec: specOf(1) },
      ),
    ).toEqual({
      speaker: "child",
      segment: "more_talk",
      input: "dont_know",
      stuck: true,
      targets: ["a"],
    });
  });

  it("회화 서버: 같은 턴 번호는 토리 행이 먼저이고 끝의 토리 말 없는 아이 행은 떼어 낸다", () => {
    const rows = sortTurns([
      row({ speaker: "child", turnNo: 1 }),
      row({ speaker: "tori", turnNo: 2 }),
      row({ speaker: "tori", turnNo: 1 }),
      row({ speaker: "child", turnNo: 2 }),
    ]);
    expect(rows.map((r) => `${r.speaker}${r.turnNo}`)).toEqual([
      "tori1",
      "child1",
      "tori2",
      "child2",
    ]);
    const { live, orphan } = splitOrphan(rows);
    expect(live).toHaveLength(3);
    expect(orphan?.turnNo).toBe(2);
    expect(splitOrphan(live).orphan).toBeNull();
  });
});

describe("흘려 보낼 줄 · 서버 자료의 영어", () => {
  it("회화 서버: 앱이 붙일 말은 칭찬 대사를 토리 말로, 답 예시는 again 의 읽어 주기 칸 say 로, 답 두 개는 two_answers 의 answers 로만 낸다", () => {
    const lines = addLinesOf([
      { kind: "praise", en: "Great job!" },
      { kind: "answer_example", en: "I like red." },
      { kind: "question", en: "What color?", ko: "무슨 색?" },
      { kind: "two_answers", answers: ["I'm nine.", "I'm ten."] },
      { kind: "more_prompt", en: MORE_PROMPT.en, ko: MORE_PROMPT.ko },
    ]);
    expect(lines).toEqual([
      { t: "s", en: "Great job!" },
      {
        t: "add",
        kind: "again",
        say: "I like red.",
        en: "What color?",
        ko: "무슨 색?",
      },
      {
        t: "add",
        kind: "two_answers",
        answers: ["I'm nine.", "I'm ten."],
      },
      {
        t: "add",
        kind: "more_prompt",
        en: MORE_PROMPT.en,
        ko: MORE_PROMPT.ko,
      },
    ]);
  });

  it("회화 서버: 저장된 붙인 줄은 지금 질문 · 카드로 다시 갈라 이어 할 때 같은 줄로 그린다", () => {
    const card = lessonAt(1).card;
    const spec = specOf(1);
    const pending = talkPositionOf({
      spec,
      card,
      metBefore: [],
      turns: [tori()],
      segment: "greeting",
      settings: FLOW,
    }).pending;
    const greeting =
      "questions" in card.greeting ? card.greeting.questions[0] : undefined;
    if (!greeting?.twoAnswers || !pending) throw new Error("견본 꼴");
    const lines = appendLinesFromText(
      [greeting.question.en, greeting.twoAnswers.join(" Or ")],
      { card, pending, koMeaning: true },
    );
    expect(lines).toEqual([
      {
        kind: "question",
        en: greeting.question.en,
        ko: greeting.question.ko,
      },
      { kind: "two_answers", answers: greeting.twoAnswers },
    ]);
  });

  it("회화 서버: 1~3단계 서버 자료의 지금 질문과 힌트에는 아이가 말할 영어(답 예시 · 영어 틀 · 영어 문장 힌트)가 없고 4단계부터는 있다", () => {
    const card = lessonAt(1).card;
    const turn = card.turns?.[0];
    if (!turn) throw new Error("견본 꼴");
    const q = {
      source: "card_turn" as const,
      index: 0,
      en: turn.question.en,
      ko: turn.question.ko,
      targets: [...turn.targets],
      askKind: "first" as const,
      answerExample: turn.answerExample,
      hintKo: turn.hintKo,
      hintEn: turn.hintEn,
    };
    const low = pendingViewOf(q, true);
    expect(low).not.toHaveProperty("answerExample");
    expect(JSON.stringify(low)).not.toContain(turn.hintEn);
    expect(pendingViewOf(q, false)?.answerExample).toBe(turn.answerExample);
    const tiers = [
      { kind: "ko" as const, text: turn.hintKo },
      { kind: "sentence" as const, text: turn.hintEn, listen: true },
    ];
    expect(hintViewsOf(tiers, true)).toEqual([
      { kind: "ko", text: turn.hintKo },
      { kind: "sentence", listen: true },
    ]);
    expect(hintViewsOf(tiers, false)[1]).toEqual({
      kind: "sentence",
      text: turn.hintEn,
      listen: true,
    });
  });
});

describe("결과 → 토리 행(8절 '회화 턴 실패' · AC-15b · AC-15i)", () => {
  const card = lessonAt(1).card;
  const turns = card.turns ?? [];
  const inTalk = [tori(), kid("greeting"), tori()];
  const answering = (i: number) => ({
    targetWords: [...(turns[i]?.targets ?? [])],
  });

  it("회화 서버: 1단계 성공 턴은 다음 카드 질문을 붙이고 그 질문이 처음 묻는 턴이면 답 두 개도 붙인다", () => {
    const plan = toriPlanOf(
      success(output({ self_used_words: [] }), ["Nice!"]),
      lowCtx(card, inTalk, answering(0)),
    );
    if (plan.kind !== "row") throw new Error("토리 행이어야 한다");
    expect(plan.append[0]).toMatchObject({
      kind: "question",
      en: turns[1]?.question.en,
    });
    expect(plan.ko).toBe("좋아!");
    expect(plan.sentSentences).toEqual(["Nice!"]);
    expect(plan.after.talkCount).toBe(2);
  });

  it("AC-15b 1단계 첫 문장 뒤 끊긴 턴은 같은 질문을 되풀이하지 않고 다음 카드 질문이 붙으며 그 턴은 '말했다'를 세지 않는다(순수 몫)", () => {
    const plan = toriPlanOf(
      {
        ok: false,
        reason: "cut_after_first",
        sentSentences: ["Good!"],
        overLength: 0,
        firstSentenceMs: 1,
        cause: "timeout",
      },
      lowCtx(card, inTalk, answering(0)),
    );
    if (plan.kind !== "row") throw new Error("토리 행이어야 한다");
    expect(plan.append.find((l) => l.kind === "question")).toMatchObject({
      en: turns[1]?.question.en,
    });
    expect(
      plan.append.some(
        (l) => l.kind === "question" && l.en === turns[0]?.question.en,
      ),
    ).toBe(false);
    expect(plan.said).toEqual([]);
    expect(plan.selfUsed).toEqual([]);
  });

  it("회화 서버: 1~3단계 첫 문장 전 실패는 카드 칭찬 대사(턴 번호로 돌림)와 다음 카드 질문, 4단계부터는 'Oops' 쉼이고 뜻은 koMeaning 단계만", () => {
    const failed: TalkOutcome = { ok: false, reason: "timeout", refusals: 0 };
    const plan = toriPlanOf(failed, lowCtx(card, inTalk, answering(0)));
    if (plan.kind !== "row") throw new Error("토리 행이어야 한다");
    expect(plan.append[0]).toEqual({
      kind: "praise",
      en: praiseLineOf(card, 2),
    });
    expect(plan.append[1]).toMatchObject({
      kind: "question",
      en: turns[1]?.question.en,
    });
    for (const level of [4, 5]) {
      const high = lessonAt(level).card;
      const broke = toriPlanOf(failed, {
        ...lowCtx(high, [tori(), kid("greeting"), tori()]),
        state: {
          ...lowCtx(high, []).state,
          spec: specOf(level),
          card: high,
        },
      });
      expect(broke).toEqual({
        kind: "break",
        line: {
          en: TALK_BREAK_LINE.en,
          ...(specOf(level).koMeaning ? { ko: TALK_BREAK_LINE.ko } : {}),
        },
      });
    }
  });

  it("회화 서버: 거절이면 카드 안전한 대사를 토리 말로 내고 다음 카드 질문으로 대화를 잇는다", () => {
    const plan = toriPlanOf(
      { ok: false, reason: "refusal", refusals: 2 },
      lowCtx(card, inTalk, answering(0)),
    );
    if (plan.kind !== "row") throw new Error("토리 행이어야 한다");
    const safeEn = safeLineOf(card.safeLines, 2);
    const safe = card.safeLines.find((l) => l.en === safeEn);
    expect(plan.speak).toEqual([safe?.en]);
    expect(plan.ko).toBe(safe?.ko ?? null);
    expect(plan.append[0]).toMatchObject({
      kind: "question",
      en: turns[1]?.question.en,
    });
  });

  it("회화 서버: 4단계 첫 문장 뒤 끊긴 턴에 물음표 문장이 없으면 아직 쓰지 않은 가장 앞 카드 질문 번호를 토리 행에 적는다", () => {
    const high = lessonAt(4).card;
    const base = lowCtx(high, []);
    const ctx: ToriPlanContext = {
      ...base,
      state: { ...base.state, spec: specOf(4), card: high },
      lites: [tori(), kid("greeting"), tori()],
    };
    const plan = toriPlanOf(
      {
        ok: false,
        reason: "cut_after_first",
        sentSentences: ["That is nice."],
        overLength: 0,
        firstSentenceMs: 1,
        cause: "connection",
      },
      ctx,
    );
    if (plan.kind !== "row") throw new Error("토리 행이어야 한다");
    expect(plan.cardQuestionNo).toBe(2);
    expect(plan.append[0]).toMatchObject({
      kind: "question",
      en: high.questions?.[1]?.en,
    });
    const asked = toriPlanOf(
      {
        ok: false,
        reason: "cut_after_first",
        sentSentences: ["What do you like?"],
        overLength: 0,
        firstSentenceMs: 1,
        cause: "connection",
      },
      ctx,
    );
    if (asked.kind !== "row") throw new Error("토리 행이어야 한다");
    expect(asked.append).toEqual([]);
    expect(asked.cardQuestionNo).toBe(0);
  });

  it("AC-15i 1단계 AI 자리에서 검사를 지난 AI 질문은 그대로 쓰여 토리 행에 실리고, 걸리면 '더 이야기할 거리' 가운데 가장 오래전에 쓴 것으로 되돌린다(순수 몫)", () => {
    const first = turns[0];
    const more = card.moreTalk?.[0];
    if (!first || !more) throw new Error("견본 꼴");
    const small: TalkCard = { ...card, turns: [first], moreTalk: [more] };
    const lites = [
      tori(),
      kid("greeting"),
      tori(),
      kid("talk", [...first.targets]),
      tori(),
    ];
    const ai = output({
      next_question_en: "Do you like apples?",
      next_question_ko: "사과 좋아해?",
      next_hint_ko: "응, 좋아해.",
      next_hints: ["Yes, I like apples."],
      next_answer_example: "Yes, I like apples.",
    });
    const passed = toriPlanOf(
      success(ai, ["Cool!"]),
      lowCtx(
        small,
        lites,
        { turnNo: 3, targetWords: [...more.targets] },
        () => true,
      ),
    );
    if (passed.kind !== "row") throw new Error("토리 행이어야 한다");
    expect(passed.aiQuestion).toMatchObject({
      en: "Do you like apples?",
      answerExample: "Yes, I like apples.",
    });
    expect(passed.append).toEqual([
      { kind: "question", en: "Do you like apples?", ko: "사과 좋아해?" },
    ]);
    const blocked = toriPlanOf(
      success(ai, ["Cool!"]),
      lowCtx(
        small,
        lites,
        { turnNo: 3, targetWords: [...more.targets] },
        () => false,
      ),
    );
    if (blocked.kind !== "row") throw new Error("토리 행이어야 한다");
    expect(blocked.aiQuestion).toBeNull();
    expect(blocked.append[0]).toMatchObject({
      kind: "question",
      en: more.question.en,
    });
    expect(
      moreTalkFallbackOf(
        toriTextOf(
          "Cool!",
          blocked.append.map((l) => ("en" in l ? l.en : "")),
        ),
        small,
      ),
    ).toBe(0);
  });

  it("회화 서버: 4단계 인사 토막의 토리 행은 AI 가 카드 질문 번호를 적어도 비운다(대화 첫 질문 1번은 앱이 붙인다)", () => {
    const high = lessonAt(4).card;
    const base = lowCtx(high, []);
    const plan = toriPlanOf(success(output({ card_question_no: 3 }), ["Hi!"]), {
      ...base,
      state: {
        ...base.state,
        spec: specOf(4),
        card: high,
        segment: "greeting",
      },
      lites: [tori()],
      child: { ...base.child, turnNo: 1, segment: "greeting" },
    });
    if (plan.kind !== "row") throw new Error("토리 행이어야 한다");
    expect(plan.cardQuestionNo).toBeNull();
  });
});

describe("아이 행 · 끝맺음 상태 · 앞 턴 짝", () => {
  const identity: Masker = (text) => ({ text, names: 0, contacts: 0 });

  it("AC-16b 이름 묻기 턴의 아이 말은 {NAME} 자리를 바꾸고 가림을 거쳐 저장 글이 된다(순수 몫)", () => {
    const card = lessonAt(1).card;
    const spec = specOf(1);
    const named: TalkCard = {
      ...card,
      greeting: {
        questions: [
          {
            question: { en: "What's your name?", ko: "이름이 뭐야?" },
            hintKo: "내 이름은 {NAME}야.",
            hintEn: "My name is {NAME}.",
            answerExample: "My name is {NAME}.",
          },
        ],
      },
    };
    const position = talkPositionOf({
      spec,
      card: named,
      metBefore: [],
      turns: [tori()],
      segment: "greeting",
      settings: FLOW,
    });
    const masker: Masker = (text) => ({
      text: text.replace(/\d{3}-\d{4}-\d{4}/g, "[연락처]"),
      names: 0,
      contacts: 0,
    });
    const fields = childRowOf(
      {
        sessionId: "00000000-0000-4000-8000-000000000000",
        clientAttemptId: "a",
        input: { mode: "speech", text: "My name is Momo 010-1234-5678" },
        hint: { opened: 2, heard: [] },
      },
      { state: { spec, card: named, position }, masker },
    );
    expect(fields.text).not.toContain("Momo");
    expect(fields.text).toContain("{NAME}");
    expect(fields.hintKind).toBe("english");
    expect(fields.hintLevel).toBe(2);
    expect(fields.withinTarget).toBe(true);
    const dontKnow = childRowOf(
      {
        sessionId: "00000000-0000-4000-8000-000000000000",
        clientAttemptId: "b",
        input: { mode: "dont_know" },
        hint: { opened: 1, heard: ["two_answers", "answer_example"] },
      },
      { state: { spec, card: named, position }, masker: identity },
    );
    expect(dontKnow).toMatchObject({
      text: null,
      inputMode: "dont_know",
      heardHelp: "answer_example",
      hintKind: "english",
      wordCount: 0,
    });
  });

  it("C149 아이 행에 듣기 사건 요약(client_listen)을 두고 '모름'의 출처는 화면의 nospeech 표시로 정하며 글은 들지 않는다", () => {
    const card = lessonAt(1).card;
    const spec = specOf(1);
    const position = talkPositionOf({
      spec,
      card,
      metBefore: [],
      turns: [tori()],
      segment: "greeting",
      settings: FLOW,
    });
    const clientListen: ClientListen = {
      br: "iPad Safari 27.0",
      r3d: true,
      listens: [
        { o: "error:no-speech", by: "button", d: 2010, snd: false, tc: "cut" },
        { o: "error:no-speech", by: "button", d: 1800, snd: false, tc: 900 },
      ],
      mf: 0,
    };
    const base = {
      sessionId: "00000000-0000-4000-8000-000000000000",
      clientAttemptId: "c",
      hint: { opened: 0, heard: [] },
    };
    const silent = childRowOf(
      { ...base, input: { mode: "dont_know", nospeech: true }, clientListen },
      { state: { spec, card, position }, masker: identity },
    );
    expect(silent.clientListen).toEqual({ ...clientListen, src: "nospeech" });
    const pressed = childRowOf(
      { ...base, input: { mode: "dont_know" } },
      { state: { spec, card, position }, masker: identity },
    );
    expect(pressed.clientListen).toEqual({ src: "button" });
    const said = childRowOf(
      { ...base, input: { mode: "speech", text: "I'm good." }, clientListen },
      { state: { spec, card, position }, masker: identity },
    );
    expect(said.clientListen).toEqual(clientListen);
    expect(JSON.stringify(said.clientListen)).not.toContain("good");
    expect(
      childRowOf(
        { ...base, input: { mode: "speech", text: "I'm good." } },
        { state: { spec, card, position }, masker: identity },
      ).clientListen,
    ).toBeNull();
  });

  it("회화 서버: 끝맺음 상태는 옴 · 실패 하나 · 두 번 실패면 못 함이고 하루 안전 상한은 셈에 넣지 않는다", () => {
    const value = {
      farewell: "Bye!",
      farewellKo: "안녕!",
      goodLines: [],
      nextTime: [],
    };
    expect(nextClosingState({ failures: 0 }, { ok: true, value })).toEqual({
      state: "ready",
      value,
    });
    expect(
      nextClosingState({ failures: 0 }, { ok: false, reason: "timeout" }),
    ).toEqual({ state: "pending", failures: 1 });
    expect(
      nextClosingState(
        { failures: CLOSING_FAILURES_TO_GIVE_UP - 1 },
        { ok: false, reason: "config" },
      ),
    ).toEqual({ state: "failed", failures: CLOSING_FAILURES_TO_GIVE_UP });
    expect(
      nextClosingState({ failures: 1 }, { ok: false, reason: "safety_cap" }),
    ).toEqual({ state: "pending", failures: 1 });
    expect(closingStateOf({ state: "skipped" })).toEqual({ state: "skipped" });
    expect(closingStateOf({ state: "ready" })).toBeUndefined();
  });

  it("AC-15k 앞 턴 짝은 아이 행 n 의 보낸 사용자 메시지와 토리 행 n+1 의 다시 쓸 토리 차례를 글자 그대로 잇고 앱의 첫 말은 토리 행 1 이다(순수 몫)", () => {
    const rows = sortTurns([
      row({
        speaker: "tori",
        turnNo: 1,
        text: toriTextOf("", ["How are you?", "I'm good. Or I'm fine."]),
        toriRewrite: "How are you?\nI'm good. Or I'm fine.",
      }),
      row({ speaker: "child", turnNo: 1, sentUserMessage: "U1" }),
      row({ speaker: "tori", turnNo: 2, toriRewrite: "A2" }),
      row({ speaker: "child", turnNo: 2, sentUserMessage: "U2" }),
      row({ speaker: "tori", turnNo: 3, toriRewrite: null }),
    ]);
    expect(historyOf(rows)).toEqual([{ user: "U1", assistant: "A2" }]);
    expect(openingLineOf(rows)).toBe("How are you? I'm good. Or I'm fine.");
  });

  it("회화 서버: 바뀐 턴에만 넣는 값의 만난 단어는 처음 스냅숏 · 오늘 쓸 말(대화 토막부터) · 그 자리까지 토리 말에서 찾는다", () => {
    const lesson = lessonAt(1);
    const unitWords = lesson.unitWords;
    const [a, b, c] = unitWords;
    if (!a || !b || !c) throw new Error("견본 꼴");
    const state = {
      start: { shownWords: [b], metBefore: [a], practiceOrder: [] },
      lesson,
      lemmaOf,
    };
    const before = talkContextAt(state, {
      rows: [],
      inTalk: false,
      knownSay: new Set(),
      friendship: 0,
      unitWords,
    });
    expect(before.metUnknownWords).toEqual([a]);
    const after = talkContextAt(state, {
      rows: [
        row({
          speaker: "tori",
          text: `Do you like ${c}?`,
          missionChecks: [2, 1],
        }),
      ],
      inTalk: true,
      knownSay: new Set([a]),
      friendship: 3,
      unitWords,
    });
    expect(after.unknownWords).not.toContain(a);
    expect(new Set(after.metUnknownWords)).toEqual(new Set([b, c]));
    expect(after.missionsDone).toEqual([1, 2]);
  });
});

describe("fix 1 — 1~3단계 붙일 말 · 끝맺음 기록 꼴", () => {
  it("회화 서버: 1~3단계 '모름' 뒤 붙일 말 줄의 글 칸(en)에는 답 예시가 없고 읽어 주기 칸(say)에만 있다", () => {
    const card = lessonAt(1).card;
    const turns = card.turns ?? [];
    const first = turns[0];
    if (!first) throw new Error("견본 꼴");
    const plan = toriPlanOf(
      success(output({ tori_en: "That's okay!" }), ["That's okay!"]),
      lowCtx(card, [tori(), kid("greeting"), tori()], {
        inputMode: "dont_know",
        text: null,
        targetWords: [...first.targets],
      }),
    );
    if (plan.kind !== "row") throw new Error("토리 행이어야 한다");
    const lines = addLinesOf(plan.append);
    const again = lines.find((l) => l.t === "add" && l.kind === "again");
    if (again?.t !== "add" || again.kind !== "again")
      throw new Error("again 줄");
    expect(again.say).toBe(first.answerExample);
    expect(again.en).toBe(first.question.en);
    for (const line of lines) {
      if (line.t === "add" && "en" in line && line.en !== undefined)
        expect(line.en).not.toContain(first.answerExample);
      if (line.t === "add" && line.kind === "two_answers")
        expect(line).not.toHaveProperty("en");
    }
  });

  it("회화 서버: '모름' 턴(input dont_know)은 AI 가 recast 를 채워도 비우고 말한 턴은 그대로 둔다(결함 D)", () => {
    const card = lessonAt(1).card;
    const first = card.turns?.[0];
    if (!first) throw new Error("견본 꼴");
    const value = output({ tori_en: "That's okay!", recast: "I am fine." });
    const dontKnow = toriPlanOf(
      success(value, ["That's okay!"]),
      lowCtx(card, [tori(), kid("greeting"), tori()], {
        inputMode: "dont_know",
        text: null,
        targetWords: [...first.targets],
      }),
    );
    if (dontKnow.kind !== "row") throw new Error("토리 행이어야 한다");
    expect(dontKnow.recast).toBeNull();
    const spoke = toriPlanOf(
      success(value, ["That's okay!"]),
      lowCtx(card, [tori(), kid("greeting"), tori()]),
    );
    if (spoke.kind !== "row") throw new Error("토리 행이어야 한다");
    expect(spoke.recast).toBe("I am fine.");
  });

  it("회화 서버: 끝맺음 기록 입력은 a 시도 꼴의 talk-closing 갈래(닫힌 까닭)로 읽고 모르는 까닭은 받지 않는다", () => {
    for (const reason of TALK_CLOSING_REASONS)
      expect(
        parseTalkAttemptInput({
          v: 1,
          kind: "talk-closing",
          step: "final",
          reason,
        }),
      ).toEqual({ v: 1, kind: "talk-closing", step: "final", reason });
    expect(
      parseTalkAttemptInput({
        v: 1,
        kind: "talk-closing",
        step: "final",
        reason: "bored",
      }),
    ).toBeUndefined();
    expect(
      parseTalkAttemptInput({ kind: "talk-closing", reason: "safety" }),
    ).toBeUndefined();
  });

  it("회화 서버: 토리 반응 뜻은 1~3단계만 저장 재료가 되고 4단계부터는 비운다(C103)", () => {
    const low = toriPlanOf(
      success(output({ tori_ko: "좋아!" }), ["Nice!"]),
      lowCtx(lessonAt(1).card, [tori(), kid("greeting"), tori()]),
    );
    if (low.kind !== "row") throw new Error("토리 행이어야 한다");
    expect(low.toriKo).toBe("좋아!");
    const high = lessonAt(4).card;
    const base = lowCtx(high, []);
    const four = toriPlanOf(success(output({ tori_ko: "좋아!" }), ["Nice!"]), {
      ...base,
      state: { ...base.state, spec: specOf(4), card: high },
      lites: [tori(), kid("greeting"), tori()],
    });
    if (four.kind !== "row") throw new Error("토리 행이어야 한다");
    expect(four.ko).toBe("좋아!");
    expect(four.toriKo).toBeNull();
  });
});

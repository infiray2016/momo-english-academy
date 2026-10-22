// 회화 수업 흐름 · 힌트 · 되짚을 말(plan-p13a 파일별 값 7 · 8 · 10 · 회화 수업 모델 1~3 · 정할 것 회11, 3.3 · C2 · C5 · C10 · C19 ·
// C20 · C30 · C31 · C33 · C36 · C44 · C95 · C97). 설계 숫자는 시험용 설정 · 견본 빌더(작은 틀) · 실시드 단계 규격에서 읽는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { TalkTurnSegment } from "@/core/ai/calls/talk";
import {
  appendAfter,
  askKindOf,
  MORE_PROMPT,
  nextQuestionIsAi,
  nextSegmentOf,
  nextUnusedQuestionNo,
  practiceItemsOf,
  practiceOrderOf,
  sendsAsDontKnow,
  type TalkFlowSettings,
  type TalkPosition,
  type TalkTurnLite,
  talkFlowOf,
  talkFlowSettingsFrom,
  talkPositionOf,
  talkTargetsOf,
  todayWordsOf,
  turnSegmentOf,
} from "@/core/conversation/flow";
import {
  heardHelpOf,
  hintKindOf,
  hintTiersOf,
  openedTierCount,
} from "@/core/conversation/hints";
import {
  againLineOf,
  farewellOf,
  wrapUpLinesOf,
} from "@/core/conversation/wrap-up";
import {
  LevelSpecsFileSchema,
  type TalkLevelSpec,
} from "@/core/seed/schema/reference";
import type { TalkCard } from "@/core/seed/schema/talk";
import { lemmaLookup } from "@/core/session/attempt";
import {
  type CellPlace,
  smallReferenceSet,
  talkCard,
} from "../fixtures/seed/builders";
import { testSettingValues } from "../fixtures/settings";

const values = testSettingValues();
const read = (key: string) => values[key];
const FLOW: TalkFlowSettings = talkFlowSettingsFrom(read);
const ref = smallReferenceSet();
const lemmaOf = lemmaLookup(ref.vocab.vocab);
const REAL_SPECS = LevelSpecsFileSchema.parse(
  JSON.parse(
    readFileSync(join(process.cwd(), "seed/level-specs.json"), "utf8"),
  ),
).levelSpecs.filter((s): s is TalkLevelSpec => s.area === "talk");

function specOf(level: number): TalkLevelSpec {
  const spec = ref.levelSpecs.levelSpecs.find(
    (s) => s.area === "talk" && s.level === level,
  );
  if (spec?.area !== "talk") throw new Error(`회화 ${level}단계 규격 없음`);
  return spec;
}
function realSpecOf(level: number): TalkLevelSpec {
  const spec = REAL_SPECS.find((s) => s.level === level);
  if (!spec) throw new Error(`회화 ${level}단계 실시드 규격 없음`);
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

const kid = (
  segment: TalkTurnSegment,
  over: Partial<Extract<TalkTurnLite, { speaker: "child" }>> = {},
): TalkTurnLite => ({
  speaker: "child",
  segment,
  input: "speech",
  stuck: false,
  targets: [],
  ...over,
});
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

/** 대화를 차례로 쌓는 도우미: 지금 자리의 질문에 아이가 답하고(또는 모름) 토리 행을 붙인다. */
function conversation(level: number, card: TalkCard, metBefore: string[] = []) {
  const spec = specOf(level);
  const rows: TalkTurnLite[] = [tori()];
  let segment: "greeting" | "talk" | "more_talk" = "greeting";
  const position = (): TalkPosition =>
    talkPositionOf({
      spec,
      card,
      metBefore,
      turns: rows,
      segment,
      settings: FLOW,
    });
  const say = (input: "speech" | "dont_know" = "speech", stuck = false) => {
    const before = position();
    const seg = turnSegmentOf(before, input, FLOW);
    rows.push(
      kid(seg, { input, stuck, targets: before.pending?.targets ?? [] }),
    );
    const after = position();
    rows.push(tori());
    if (after.greetingDone && segment === "greeting") segment = "talk";
    return { before, after };
  };
  const chooseMore = () => {
    segment = "more_talk";
    const last = rows.at(-1);
    if (last?.speaker === "tori")
      rows[rows.length - 1] = { ...last, moreChosen: true };
  };
  const args = () => ({
    spec,
    card,
    metBefore,
    turns: [...rows],
    segment,
    settings: FLOW,
  });
  return { spec, rows, position, say, chooseMore, args };
}

describe("회화 흐름: 토막 · 오늘 쓸 말 · 말해 보기", () => {
  it("회화 흐름: 토막 차례는 단계 규격이고 오늘 쓸 말 · 말해 보기 항목이 없으면 그 토막을 건너뛴다", () => {
    const one = specOf(1);
    expect(
      talkFlowOf({ spec: one, todayWordCount: 2, practiceCount: 2 }),
    ).toEqual(["greeting", "today_words", "practice", "talk", "wrap_up"]);
    expect(
      talkFlowOf({ spec: one, todayWordCount: 0, practiceCount: 0 }),
    ).toEqual(["greeting", "talk", "wrap_up"]);
    expect(
      talkFlowOf({ spec: one, todayWordCount: 2, practiceCount: 0 }),
    ).toEqual(["greeting", "today_words", "talk", "wrap_up"]);
    expect(
      talkFlowOf({ spec: specOf(4), todayWordCount: 2, practiceCount: 2 }),
    ).toEqual(["greeting", "today_words", "talk", "wrap_up"]);
    const flow = talkFlowOf({ spec: one, todayWordCount: 2, practiceCount: 2 });
    expect(nextSegmentOf(flow, "greeting")).toBe("today_words");
    expect(nextSegmentOf(flow, "talk")).toBe("wrap_up");
    expect(nextSegmentOf(flow, "more_talk")).toBe("wrap_up");
    expect(nextSegmentOf(flow, "wrap_up")).toBeNull();
  });

  it("AC-2f 1단계 회화에서 건너뛴 배정 수업의 새 단어는 오늘 쓸 말에 더해지고 그 단어를 묻는 턴은 처음 묻는 턴이라 답 두 개를 들려준다", () => {
    const lesson = lessonAt(1, { lessonNo: 2 });
    const first = lessonAt(1, { lessonNo: 1 });
    const skippedWords = first.newWords;
    const shown = todayWordsOf({
      card: lesson.card,
      lesson,
      metBefore: [],
      known: [],
      k: lesson.newWords.length,
      vocab: (word) => {
        const entry = ref.vocab.vocab.find((v) => v.word === word);
        return entry
          ? { meaningKo: entry.meaningKo, example: entry.example }
          : undefined;
      },
    });
    for (const word of lesson.newWords)
      expect(shown.find((w) => w.word === word)?.added).toBe(false);
    const added = shown.filter((w) => w.added).map((w) => w.word);
    expect(added.length).toBeGreaterThan(0);
    for (const word of added) expect(skippedWords).toContain(word);
    // 그 단어를 노리는 카드 턴(카드는 다시 묻는 턴으로 적음)에 닿을 때까지 답한다
    const turnIndex = (lesson.card.turns ?? []).findIndex((t) =>
      t.targets.some((w) => added.includes(w)),
    );
    expect(lesson.card.turns?.[turnIndex]?.ask).toBe("re_ask");
    const talk = conversation(1, lesson.card, []);
    talk.say(); // 인사
    for (let i = 0; i < turnIndex; i++) talk.say();
    const pending = talk.position().pending;
    expect(pending?.source).toBe("card_turn");
    expect(pending?.index).toBe(turnIndex);
    expect(pending?.askKind).toBe("first");
    expect(pending?.twoAnswers).toHaveLength(2);
  });

  it("회화 흐름: 말해 보기는 카드 오늘 쓸 말 가운데 예문 뜻이 있는 예문만이고 둘째 바퀴부터는 세션 id 로 정한 다른 차례다", () => {
    const lesson = lessonAt(1);
    const card: TalkCard = {
      ...lesson.card,
      todayWords: [
        ...lesson.card.todayWords,
        { word: "extra", meaningKo: "뜻", example: "No meaning here." },
      ],
    };
    const items = practiceItemsOf({ spec: specOf(1), card });
    expect(items.map((i) => i.word)).toEqual(
      lesson.card.todayWords.map((w) => w.word),
    );
    expect(practiceItemsOf({ spec: specOf(4), card })).toEqual([]);
    const rounds = values["talk.practice_rounds"] as number;
    const order = practiceOrderOf("session-a", 4, rounds);
    expect(order).toHaveLength(rounds);
    expect(order[0]).toEqual([0, 1, 2, 3]);
    for (const round of order.slice(1)) {
      expect([...round].sort()).toEqual([0, 1, 2, 3]);
      expect(round).not.toEqual(order[0]);
    }
    expect(practiceOrderOf("session-a", 4, rounds)).toEqual(order);
    expect(practiceOrderOf("session-a", 1, rounds)).toEqual(
      Array.from({ length: rounds }, () => [0]),
    );
    expect(practiceOrderOf("session-a", 0, rounds)).toEqual(
      Array.from({ length: rounds }, () => []),
    );
  });
});

describe("회화 흐름: 처음 · 다시 묻는 턴(C2)", () => {
  it("AC-15m 카드가 다시 묻는 턴으로 적은 턴이라도 아이가 그 단어를 앞 회화 세션에서 만나지 않았고 이 대화에서도 묻지 않았으면 처음 묻는 턴이다", () => {
    expect(
      askKindOf({ targets: ["cat"], metBefore: [], askedTargets: [] }),
    ).toBe("first");
    expect(
      askKindOf({ targets: ["cat"], metBefore: [], askedTargets: ["cat"] }),
    ).toBe("re_ask");
    expect(
      askKindOf({
        targets: ["cat", "dog"],
        metBefore: ["cat"],
        askedTargets: [],
      }),
    ).toBe("first");
    expect(askKindOf({ targets: [], metBefore: [], askedTargets: [] })).toBe(
      "re_ask",
    );
  });

  it("AC-15m 카드가 처음 묻는 턴으로 적은 단어를 앞 세션에서 만났으면 다시 묻는 턴이라 1단계에서도 답 두 개를 들려주지 않는다", () => {
    const lesson = lessonAt(1);
    const turn0 = lesson.card.turns?.[0];
    expect(turn0?.ask).toBe("first");
    expect(turn0?.twoAnswers).toBeDefined();
    const met = conversation(1, lesson.card, [...(turn0?.targets ?? [])]);
    met.say();
    expect(met.position().pending?.askKind).toBe("re_ask");
    expect(met.position().pending?.twoAnswers).toBeUndefined();
    const fresh = conversation(1, lesson.card, []);
    fresh.say();
    expect(fresh.position().pending?.askKind).toBe("first");
    expect(fresh.position().pending?.twoAnswers).toEqual(turn0?.twoAnswers);
  });

  it("회화 흐름: 1단계 인사 턴은 노리는 단어가 없어도 답 두 개를 들려주고 마지막 인사 턴은 인사 끝으로 보내며 질문을 붙이지 않는다", () => {
    const lesson = lessonAt(1);
    const talk = conversation(1, lesson.card);
    const start = talk.position();
    expect(start.pending?.source).toBe("card_greeting");
    expect(start.pending?.askKind).toBe("first");
    expect(start.pending?.twoAnswers).toBeDefined();
    expect(turnSegmentOf(start, "speech", FLOW)).toBe("greeting_end");
    expect(turnSegmentOf(start, "dont_know", FLOW)).toBe("greeting");
    const { after } = talk.say();
    expect(after.greetingDone).toBe(true);
    expect(
      appendAfter({
        spec: talk.spec,
        card: lesson.card,
        after,
        outcome: "ok",
        turnNo: 1,
      }),
    ).toEqual([]);
    expect(after.pending).toBeNull();
    // 대화 토막에 들어가면 첫 질문은 첫 대화 턴(카드 대화 첫 질문 — 앱이 인사 끝 토리 행에 붙임)
    const talkStart = talkPositionOf({
      spec: talk.spec,
      card: lesson.card,
      metBefore: [],
      turns: talk.rows,
      segment: "talk",
      settings: FLOW,
    });
    expect(talkStart.pending?.source).toBe("card_turn");
    expect(talkStart.pending?.en).toBe(lesson.card.firstQuestion);
  });
});

describe("회화 흐름: 질문 차례 · '모름' · 목표 턴(C36 · C30)", () => {
  it("회화 흐름: 같은 질문의 '모름' 둘째부터 힌트가 마지막 단까지 열리고 talk.dontknow_max 번째에 다음 질문으로 간다", () => {
    const lesson = lessonAt(1);
    const talk = conversation(1, lesson.card);
    talk.say();
    const q = talk.position().pending;
    const tiers = hintTiersOf({
      spec: talk.spec,
      card: lesson.card,
      pending: q,
    });
    expect(openedTierCount({ tiers, pressed: 0, dontKnowCount: 0 })).toBe(0);
    expect(openedTierCount({ tiers, pressed: 1, dontKnowCount: 1 })).toBe(1);
    for (let i = 1; i < FLOW.dontknowMax; i++) {
      const { after } = talk.say("dont_know");
      expect(after.pending?.index).toBe(q?.index);
      expect(after.dontKnowCount).toBe(i);
      // '모름' 뒤에는 카드 답 예시와 같은 질문(1단계 처음 묻는 턴이면 답 두 개도)
      const lines = appendAfter({
        spec: talk.spec,
        card: lesson.card,
        after,
        outcome: "ok",
        turnNo: i + 1,
      });
      expect(lines.map((l) => l.kind)).toEqual([
        "answer_example",
        "question",
        "two_answers",
      ]);
      expect(lines[0]).toEqual({
        kind: "answer_example",
        en: q?.answerExample,
      });
      if (i >= 2)
        expect(openedTierCount({ tiers, pressed: 0, dontKnowCount: i })).toBe(
          tiers.length,
        );
    }
    const { after } = talk.say("dont_know");
    expect(after.pending?.index).toBe((q?.index ?? 0) + 1);
    expect(after.dontKnowCount).toBe(0);
    // no-speech 가 talk.nospeech_dontknow_count 번 이어지면 '모름'으로 보낸다(평가 턴은 아님)
    expect(
      sendsAsDontKnow(
        { nospeechInRow: FLOW.nospeechDontknowCount, levelTest: false },
        FLOW,
      ),
    ).toBe(true);
    expect(
      sendsAsDontKnow(
        { nospeechInRow: FLOW.nospeechDontknowCount - 1, levelTest: false },
        FLOW,
      ),
    ).toBe(false);
    expect(
      sendsAsDontKnow(
        { nospeechInRow: FLOW.nospeechDontknowCount, levelTest: true },
        FLOW,
      ),
    ).toBe(false);
  });

  it("회화 흐름: '모름' 턴과 막힘으로 볼 말 턴은 말 주고받기 수에 들지 않는다", () => {
    const lesson = lessonAt(1);
    const talk = conversation(1, lesson.card);
    talk.say();
    talk.say();
    expect(talk.position().talkCount).toBe(2);
    talk.say("dont_know");
    expect(talk.position().talkCount).toBe(2);
    const { after } = talk.say("speech", true);
    expect(after.talkCount).toBe(2);
    expect(after.dontKnowCount).toBe(2);
    // 막힘 턴에도 답 예시와 같은 질문을 붙인다
    expect(
      appendAfter({
        spec: talk.spec,
        card: lesson.card,
        after,
        outcome: "ok",
        turnNo: 5,
      }).map((l) => l.kind)[0],
    ).toBe("answer_example");
    expect(after.childTurns).toBe(4);
  });

  it("회화 흐름: 1~3단계 카드 질문이 넘어간 질문으로 모자라면 넘어간 질문을 답 예시와 함께 한 번 더 묻고 그다음 '더 이야기할 거리', 그다음 AI 차례다", () => {
    const lesson = lessonAt(1);
    const card = lesson.card;
    const turns = card.turns ?? [];
    const more = card.moreTalk ?? [];
    const talk = conversation(1, card);
    talk.say();
    // 앞 카드 턴 넷을 '모름'으로 넘긴다
    const skips = 4;
    for (let s = 0; s < skips; s++)
      for (let i = 0; i < FLOW.dontknowMax; i++) talk.say("dont_know");
    // 나머지 카드 턴에 답한다
    for (let i = skips; i < turns.length; i++) talk.say();
    const target = talk.spec.targetTurns;
    expect(talk.position().talkCount).toBe(1 + turns.length - skips);
    expect(talk.position().talkCount).toBeLessThan(target);
    // 넘어간 질문(답 예시와 함께) — 첫째는 답하고 나머지는 다시 '모름'
    const reask = talk.position();
    expect(reask.pending?.source).toBe("card_skipped");
    expect(reask.pending?.index).toBe(0);
    expect(reask.pending?.withAnswerExample).toBe(true);
    const { after: afterFirst } = talk.say();
    expect(afterFirst.pending?.source).toBe("card_skipped");
    expect(afterFirst.pending?.index).toBe(1);
    expect(
      appendAfter({
        spec: talk.spec,
        card,
        after: afterFirst,
        outcome: "ok",
        turnNo: 99,
      })
        .map((l) => l.kind)
        .slice(0, 2),
    ).toEqual(["answer_example", "question"]);
    for (let s = 1; s < skips; s++)
      for (let i = 0; i < FLOW.dontknowMax; i++) talk.say("dont_know");
    // 그다음 '더 이야기할 거리'(늘 다시 묻는 턴)
    for (let m = 0; m < more.length; m++) {
      const p = talk.position();
      expect(p.pending?.source).toBe("more_talk");
      expect(p.pending?.index).toBe(m);
      expect(p.pending?.askKind).toBe("re_ask");
      expect(p.moreTalkUsedUp).toBe(false);
      // 이번에 답하면 다음이 AI 자리인지(C100 — 목표 턴 전에도 회화 턴이 AI 질문을 쓴다)
      expect(nextQuestionIsAi(talk.args())).toBe(m === more.length - 1);
      talk.say();
    }
    // 그다음 AI(대신 쓸 것은 이 대화에서 가장 오래전에 쓴 '더 이야기할 거리')
    const ai = talk.position();
    expect(ai.targetReached).toBe(false);
    expect(ai.moreTalkUsedUp).toBe(true);
    expect(ai.pending?.source).toBe("ai_more_talk");
    expect(ai.pending?.askKind).toBe("re_ask");
    expect(ai.pending?.fallback?.index).toBe(0);
    // AI 질문이 검사에 걸려 0번으로 대신했으면(그 질문을 붙인 토리 행에 기록) 그 질문을 '모름'으로 넘긴 뒤 다음 대신은 1번
    // (같은 질문이 이어 나오지 않게, AC-15i)
    const asked = talk.rows.at(-1);
    if (asked?.speaker !== "tori")
      throw new Error("마지막 행이 토리 행이 아니다");
    talk.rows[talk.rows.length - 1] = { ...asked, moreTalkFallback: 0 };
    const replaced = talk.position();
    expect(replaced.pending?.source).toBe("ai_more_talk");
    expect(replaced.pending?.en).toBe(more[0]?.question.en);
    let next = replaced;
    for (let i = 0; i < FLOW.dontknowMax; i++)
      next = talk.say("dont_know").after;
    expect(next.targetReached).toBe(false);
    expect(next.pending?.source).toBe("ai_more_talk");
    expect(next.pending?.fallback?.index).toBe(more.length > 1 ? 1 : 0);
    // AI 질문을 붙일 때는 AI 것을, 없거나 걸리면 대신 것을
    const withAi = appendAfter({
      spec: talk.spec,
      card,
      after: next,
      outcome: "ok",
      turnNo: 50,
      ai: { en: "What is it?", ko: "뭐야?", answerExample: "It is a cat." },
    });
    expect(withAi.find((l) => l.kind === "question")?.en).toBe("What is it?");
    const withoutAi = appendAfter({
      spec: talk.spec,
      card,
      after: next,
      outcome: "ok",
      turnNo: 50,
    });
    expect(withoutAi.find((l) => l.kind === "question")?.en).toBe(
      more[next.pending?.fallback?.index ?? 0]?.question.en,
    );
  });

  it("회화 흐름: 목표 턴에 닿은 턴에는 카드 질문 대신 'Do you want to talk more?'를 붙이고 '더 이야기하기' 한 번은 talk.more_talk_round_turns 턴이다", () => {
    const lesson = lessonAt(1);
    const card = lesson.card;
    const talk = conversation(1, card);
    const target = talk.spec.targetTurns;
    let last = talk.say();
    for (let i = 1; i < target; i++) last = talk.say();
    expect(last.after.targetReached).toBe(true);
    expect(last.after.talkCount).toBe(target);
    expect(last.after.awaitingChoice).toBe(true);
    expect(last.after.pending).toBeNull();
    expect(
      appendAfter({
        spec: talk.spec,
        card,
        after: last.after,
        outcome: "ok",
        turnNo: target,
      }),
    ).toEqual([
      { kind: "more_prompt", en: MORE_PROMPT.en, ko: MORE_PROMPT.ko },
    ]);
    expect(MORE_PROMPT.en).toBe("Do you want to talk more?");
    // 고르기 전에 다시 읽어도 고르기를 기다린다
    expect(talk.position().awaitingChoice).toBe(true);
    talk.chooseMore();
    const round = talk.position();
    expect(round.awaitingChoice).toBe(false);
    expect(round.moreRound).toBe(1);
    expect(round.moreTurnsLeft).toBe(FLOW.moreRoundTurns);
    // '더 이야기하기'는 '더 이야기할 거리'부터
    expect(round.pending?.source).toBe("more_talk");
    for (let i = 0; i < FLOW.moreRoundTurns - 1; i++) talk.say();
    expect(talk.position().moreTurnsLeft).toBe(1);
    const end = talk.say();
    expect(end.after.awaitingChoice).toBe(true);
    expect(end.after.moreTurnsLeft).toBe(0);
    expect(end.after.talkCount).toBe(target);
    talk.chooseMore();
    expect(talk.position().moreRound).toBe(2);
    expect(talk.position().moreTurnsLeft).toBe(FLOW.moreRoundTurns);
  });

  it("회화 흐름: 4단계부터 대신 질문은 아직 쓰지 않은 가장 앞 카드 질문이다", () => {
    const lesson = lessonAt(4);
    const card = lesson.card;
    const spec = specOf(4);
    const rows: TalkTurnLite[] = [
      tori(),
      kid("greeting_end"),
      // 인사 끝 응답의 AI 값(카드 질문 번호 0) — 대화 첫 질문 1번은 흐름이 스스로 '쓴 것'에 넣는다(fix 1 M6)
      tori({ cardQuestionNo: 0 }),
      kid("talk"),
      tori({ cardQuestionNo: 3 }),
      kid("talk"),
      tori({ cardQuestionNo: 0 }),
    ];
    const position = talkPositionOf({
      spec,
      card,
      metBefore: [],
      turns: rows,
      segment: "talk",
      settings: FLOW,
    });
    expect(position.usedQuestionNos).toEqual([1, 0, 3, 0]);
    expect(nextUnusedQuestionNo(position, card)).toBe(2);
    expect(position.pending?.source).toBe("ai_question");
    // 끊긴 턴: 보낸 문장에 물음표 문장이 없으면 그 카드 질문을 붙인다
    const cut = appendAfter({
      spec,
      card,
      after: position,
      outcome: "cut",
      turnNo: 3,
      sentHasQuestion: false,
    });
    expect(cut).toEqual([
      {
        kind: "question",
        en: card.questions?.[1]?.en,
        ko: card.questions?.[1]?.ko,
      },
    ]);
    expect(
      appendAfter({
        spec,
        card,
        after: position,
        outcome: "cut",
        turnNo: 3,
        sentHasQuestion: true,
      }),
    ).toEqual([]);
    expect(
      appendAfter({ spec, card, after: position, outcome: "ok", turnNo: 3 }),
    ).toEqual([]);
    // 카드 질문 번호가 오면 그 질문
    const carded = talkPositionOf({
      spec,
      card,
      metBefore: [],
      segment: "talk",
      settings: FLOW,
      turns: [...rows.slice(0, -1), tori({ cardQuestionNo: 2 })],
    });
    expect(carded.pending?.source).toBe("card_question");
    expect(carded.pending?.questionNo).toBe(2);
    expect(carded.pending?.targets).toEqual(card.questions?.[1]?.targets);
    // 모두 썼으면 없음
    const all = (card.questions ?? []).map((_, i) =>
      tori({ cardQuestionNo: i + 1 }),
    );
    const used = talkPositionOf({
      spec,
      card,
      metBefore: [],
      segment: "talk",
      settings: FLOW,
      turns: [tori(), kid("greeting_end"), ...all],
    });
    expect(nextUnusedQuestionNo(used, card)).toBeNull();
  });

  it("회화 흐름: 4단계부터 대화 첫 질문(카드 1번)은 흐름이 스스로 쓴 카드 질문에 넣어 끊긴 턴의 대신 질문으로 다시 나오지 않는다", () => {
    const card = lessonAt(4).card;
    const spec = specOf(4);
    const rows: TalkTurnLite[] = [
      tori(),
      kid("greeting_end"),
      tori({ cardQuestionNo: 0 }),
    ];
    const start = talkPositionOf({
      spec,
      card,
      metBefore: [],
      turns: rows,
      segment: "talk",
      settings: FLOW,
    });
    expect(start.pending?.questionNo).toBe(1);
    expect(nextUnusedQuestionNo(start, card)).toBe(2);
    expect(
      nextQuestionIsAi({
        spec,
        card,
        metBefore: [],
        turns: rows,
        segment: "talk",
        settings: FLOW,
      }),
    ).toBe(false);
  });

  it("회화 흐름: 4단계부터 목표 턴과 '더 이야기하기' 한 바퀴 끝에서도 흐름이 스스로 고르기를 열고 고른 표지가 설 때까지 기다린다", () => {
    const card = lessonAt(4).card;
    const spec = specOf(4);
    const rows: TalkTurnLite[] = [
      tori(),
      kid("greeting_end"),
      tori({ cardQuestionNo: 0 }),
    ];
    let segment: "talk" | "more_talk" = "talk";
    const at = () =>
      talkPositionOf({
        spec,
        card,
        metBefore: [],
        turns: rows,
        segment,
        settings: FLOW,
      });
    // AI 가 제 말로 '더 이야기할래?'를 묻는 토리 행 — 앱이 붙인 말이 없어도 고르기 차례다
    for (let i = 1; i < spec.targetTurns; i++)
      rows.push(kid("talk"), tori({ cardQuestionNo: 0 }));
    let p = at();
    expect(p.talkCount).toBe(spec.targetTurns);
    expect(p.awaitingChoice).toBe(true);
    expect(p.pending).toBeNull();
    const choose = () => {
      segment = "more_talk";
      const last = rows.at(-1);
      if (last?.speaker !== "tori")
        throw new Error("마지막 행이 토리 행이 아니다");
      rows[rows.length - 1] = {
        ...last,
        moreChosen: true,
        cardQuestionNo: nextUnusedQuestionNo(at(), card),
      };
    };
    for (const round of [1, 2]) {
      choose();
      p = at();
      expect(p.awaitingChoice, `바퀴 ${round}`).toBe(false);
      expect(p.moreRound).toBe(round);
      expect(p.moreTurnsLeft).toBe(FLOW.moreRoundTurns);
      expect(p.pending?.source).toBe("card_question");
      for (let i = 0; i < FLOW.moreRoundTurns; i++)
        rows.push(kid("more_talk"), tori({ cardQuestionNo: 0 }));
      p = at();
      expect(p.awaitingChoice, `바퀴 ${round} 끝`).toBe(true);
      expect(p.moreRound).toBe(round);
      expect(p.moreTurnsLeft).toBe(0);
      expect(p.talkCount).toBe(spec.targetTurns);
    }
  });

  it("회화 흐름: 4단계부터 이어 묻는 질문이 노린 단어를 뒤 카드 질문이 노리면 다시 묻는 턴이다", () => {
    const card = lessonAt(4).card;
    const spec = specOf(4);
    const q1 = card.questions?.[0];
    const q2 = card.questions?.[1];
    if (!q1 || !q2) throw new Error("카드 질문이 둘 있어야 한다");
    expect(q2.targets.some((w) => !q1.targets.includes(w))).toBe(true);
    const rows = (followTargets: string[]): TalkTurnLite[] => [
      tori(),
      kid("greeting_end"),
      tori({ cardQuestionNo: 0 }),
      kid("talk", { targets: q1.targets }),
      tori({ cardQuestionNo: 0 }),
      // AI 이어 묻는 질문에 답한 턴 — 그 질문이 노린 단어는 talk_turns.target_words 에 있다
      kid("talk", { targets: followTargets }),
      tori({ cardQuestionNo: 2 }),
    ];
    const at = (turns: TalkTurnLite[]) =>
      talkPositionOf({
        spec,
        card,
        metBefore: [],
        turns,
        segment: "talk",
        settings: FLOW,
      }).pending;
    expect(at(rows(q2.targets))?.questionNo).toBe(2);
    expect(at(rows(q2.targets))?.askKind).toBe("re_ask");
    expect(at(rows([]))?.askKind).toBe("first");
  });

  it("회화 흐름: 1~3단계 AI 질문에 '모름'이면 토리 행에 실린 그 AI 질문을 답 예시와 함께 다시 붙인다", () => {
    const lesson = lessonAt(1);
    const card = lesson.card;
    const more = card.moreTalk ?? [];
    const talk = conversation(1, card);
    for (let i = 0; i < talk.spec.targetTurns; i++) talk.say();
    expect(talk.position().awaitingChoice).toBe(true);
    talk.chooseMore();
    for (let m = 0; m < more.length; m++) {
      expect(nextQuestionIsAi(talk.args())).toBe(m === more.length - 1);
      talk.say();
    }
    const ai = {
      en: "What color is your ball?",
      ko: "네 공은 무슨 색이야?",
      answerExample: "My ball is red.",
      hintKo: "내 공은 빨간색이야.",
      hints: ["My ball is red."],
    };
    const last = talk.rows.at(-1);
    if (last?.speaker !== "tori")
      throw new Error("마지막 행이 토리 행이 아니다");
    talk.rows[talk.rows.length - 1] = { ...last, aiQuestion: ai };
    const asked = talk.position();
    expect(asked.pending?.source).toBe("ai_more_talk");
    expect(asked.pending?.en).toBe(ai.en);
    const { after } = talk.say("dont_know");
    expect(after.pending?.en).toBe(ai.en);
    expect(after.dontKnowCount).toBe(1);
    expect(
      appendAfter({ spec: talk.spec, card, after, outcome: "ok", turnNo: 30 }),
    ).toEqual([
      { kind: "answer_example", en: ai.answerExample },
      { kind: "question", en: ai.en, ko: ai.ko },
    ]);
    // 힌트도 실린 AI 힌트로(1단계 뜻 → 영어 문장)
    expect(
      hintTiersOf({ spec: talk.spec, card, pending: after.pending }),
    ).toEqual([
      { kind: "ko", text: ai.hintKo },
      { kind: "sentence", text: "My ball is red.", listen: true },
    ]);
  });

  it("회화 흐름: 1~3단계 두 번 실패한 턴은 카드 칭찬 대사와 다음 카드 질문을 붙이고 정리 토막이면 대화가 닫혔다", () => {
    const lesson = lessonAt(1);
    const talk = conversation(1, lesson.card);
    talk.say();
    const { after } = talk.say();
    const lines = appendAfter({
      spec: talk.spec,
      card: lesson.card,
      after,
      outcome: "failed",
      turnNo: 2,
    });
    const praise = lines[0];
    expect(praise?.kind).toBe("praise");
    expect(lesson.card.praiseLines).toContain(
      praise?.kind === "praise" ? praise.en : undefined,
    );
    expect(lines[1]).toEqual({
      kind: "question",
      en: after.pending?.en,
      ko: after.pending?.ko,
    });
    const closed = talkPositionOf({
      spec: talk.spec,
      card: lesson.card,
      metBefore: [],
      turns: talk.rows,
      segment: "wrap_up",
      settings: FLOW,
    });
    expect(closed.closed).toBe(true);
    expect(closed.pending).toBeNull();
  });

  it("회화 흐름: 노리는 단어 목록은 1~3단계 턴마다, 4단계부터 카드 질문마다다", () => {
    const one = lessonAt(1).card;
    expect(talkTargetsOf(one)).toEqual((one.turns ?? []).map((t) => t.targets));
    const four = lessonAt(4).card;
    expect(talkTargetsOf(four)).toEqual(
      (four.questions ?? []).map((q) => q.targets),
    );
  });

  it("회화 흐름: 설정 키가 없거나 꼴이 틀리면 던진다", () => {
    expect(() => talkFlowSettingsFrom(() => undefined)).toThrow();
    expect(() =>
      talkFlowSettingsFrom((key) =>
        key === "talk.dontknow_max" ? 0 : values[key],
      ),
    ).toThrow();
  });
});

describe("회화 힌트(C10 · C20 · C31)", () => {
  const ai = {
    hintKo: "나는 사과를 좋아해.",
    hints: ["I like ___.", "I like apples."],
    usable: ["Apples, please."],
  };

  it("회화 힌트: 1~2단계는 뜻 → 영어 문장(듣기 단추), 3단계는 뜻 → 영어 틀 → 영어 문장이다", () => {
    for (const level of [1, 3]) {
      const lesson = lessonAt(level);
      const talk = conversation(level, lesson.card);
      talk.say();
      const pending = talk.position().pending;
      const tiers = hintTiersOf({
        spec: talk.spec,
        card: lesson.card,
        pending,
      });
      const turn = lesson.card.turns?.[0];
      expect(tiers.map((t) => t.kind)).toEqual(talk.spec.hintTiers);
      expect(tiers[0]?.text).toBe(turn?.hintKo);
      expect(tiers.at(-1)).toEqual({
        kind: "sentence",
        text: turn?.hintEn,
        listen: true,
      });
      if (level === 3) expect(tiers[1]?.text).toBe(turn?.frameEn);
    }
  });

  it("AC-15h 6단계 다시 묻는 턴의 힌트는 한국어 뜻 단부터, 처음 묻는 턴은 AI 출력과 관계없이 영어 틀부터 열린다", () => {
    const spec = realSpecOf(6);
    const card = lessonAt(6).card;
    const base = {
      source: "card_question" as const,
      questionNo: 1,
      targets: [],
      answerExample: "",
    };
    const reask = hintTiersOf({
      spec,
      card,
      pending: { ...base, askKind: "re_ask" },
      ai,
    });
    expect(reask.map((t) => t.kind)).toEqual(["ko", "frame", "sentence"]);
    expect(reask[0]?.text).toBe(ai.hintKo);
    // 6단계는 첫 단(영어 틀)부터 쓸 수 있는 말
    expect(reask[1]?.usable).toEqual(ai.usable);
    const first = hintTiersOf({
      spec,
      card,
      pending: { ...base, askKind: "first" },
      ai,
    });
    expect(first.map((t) => t.kind)).toEqual(["frame", "sentence"]);
    expect(first[0]?.text).toBe(ai.hints[0]);
    // AI 힌트가 없거나 걸리면 그 턴 카드 질문 번호의 카드 힌트, 번호 0 이면 단 없음(C19)
    const fromCard = hintTiersOf({
      spec,
      card,
      pending: { ...base, askKind: "first" },
    });
    expect(fromCard[0]?.text).toBe(card.questions?.[0]?.hintTiers[0]);
    expect(
      hintTiersOf({
        spec,
        card,
        pending: {
          ...base,
          questionNo: 0,
          source: "ai_question",
          askKind: "first",
        },
      }),
    ).toEqual([]);
    // 5단계는 뜻 → 영어 틀(쓸 수 있는 말 함께) → 영어 문장
    const five = hintTiersOf({
      spec: realSpecOf(5),
      card: lessonAt(5).card,
      pending: { ...base, askKind: "first" },
      ai,
    });
    expect(five.map((t) => t.kind)).toEqual(["ko", "frame", "sentence"]);
    expect(five[1]?.usable).toEqual(ai.usable);
  });

  it("AC-15h 10단계 다시 묻는 턴에는 힌트 단이 없고 8단계 다시 묻는 턴은 한국어 뜻 다음 영어 틀이다", () => {
    const base = {
      source: "card_question" as const,
      questionNo: 1,
      targets: [],
      answerExample: "",
      askKind: "re_ask" as const,
    };
    expect(
      hintTiersOf({
        spec: realSpecOf(10),
        card: lessonAt(10).card,
        pending: base,
        ai,
      }),
    ).toEqual([]);
    const eight = hintTiersOf({
      spec: realSpecOf(8),
      card: lessonAt(8).card,
      pending: base,
      ai,
    });
    expect(eight.map((t) => t.kind)).toEqual(["ko", "frame"]);
    expect(
      hintTiersOf({
        spec: realSpecOf(8),
        card: lessonAt(8).card,
        pending: { ...base, askKind: "first" },
        ai,
      }).map((t) => t.kind),
    ).toEqual(["frame"]);
  });

  it("AC-15h 영어 문장 단을 연 턴과 답 예시를 들은 턴은 힌트 종류가 '영어'다", () => {
    const tiers = [
      { kind: "ko" as const, text: "뜻" },
      { kind: "frame" as const, text: "I like ___." },
      { kind: "sentence" as const, text: "I like it.", listen: true },
    ];
    expect(hintKindOf({ opened: tiers, heard: [] })).toBe("english");
    expect(hintKindOf({ opened: tiers.slice(0, 1), heard: [] })).toBe(
      "meaning_only",
    );
    expect(hintKindOf({ opened: [], heard: [] })).toBe("none");
    expect(hintKindOf({ opened: [], heard: ["answer_example"] })).toBe(
      "english",
    );
    expect(
      hintKindOf({ opened: tiers.slice(0, 1), heard: ["two_answers"] }),
    ).toBe("english");
    expect(heardHelpOf([])).toBe("none");
    expect(heardHelpOf(["two_answers"])).toBe("two_answers");
    expect(heardHelpOf(["two_answers", "answer_example"])).toBe(
      "answer_example",
    );
  });
});

describe("회화 정리 · 끝인사(C33)", () => {
  it("AC-15n 정리 토막의 되짚을 말은 토리가 되풀이한 바른 문장 가운데 오늘 쓸 말이 든 것과 카드 정리 대사로 오늘 쓸 말 단어 수까지이고 보일 단어가 없는 수업은 카드 정리 대사다", () => {
    const lesson = lessonAt(1);
    const [w1, w2] = lesson.newWords;
    if (!w1 || !w2) throw new Error("새 단어가 둘 있어야 한다");
    const closingLines = [
      { en: "Today we talked a lot.", ko: "오늘 이야기 많이 했어." },
      { en: "You did great.", ko: "잘했어." },
    ];
    const lines = wrapUpLinesOf({
      recasts: [`I see a ${w1}.`, "Good job.", `It is ${w1}.`, ""],
      todayWords: [w1, w2],
      closingLines,
      koMeaning: true,
      lemmaOf,
    });
    expect(lines).toEqual([
      { en: `It is ${w1}.`, source: "recast" },
      { en: closingLines[0]?.en, ko: closingLines[0]?.ko, source: "card" },
    ]);
    // 같은 되풀이 문장은 두 번 쓰지 않는다
    const both = wrapUpLinesOf({
      recasts: [`I like ${w1} and ${w2}.`],
      todayWords: [w1, w2],
      closingLines,
      koMeaning: false,
      lemmaOf,
    });
    expect(both).toEqual([
      { en: `I like ${w1} and ${w2}.`, source: "recast" },
      { en: closingLines[0]?.en, source: "card" },
    ]);
    // 보일 단어가 없는 수업은 카드 정리 대사 전부
    expect(
      wrapUpLinesOf({
        recasts: [`It is ${w1}.`],
        todayWords: [],
        closingLines,
        koMeaning: true,
        lemmaOf,
      }),
    ).toEqual(closingLines.map((l) => ({ ...l, source: "card" })));
  });

  it("회화 정리: 끝인사는 검사를 지난 끝맺음 것이 와 있으면 그것, 아니면 카드 끝인사이고 뜻은 1~4단계만", () => {
    const card = lessonAt(1).card;
    expect(
      farewellOf({
        closing: { farewell: "Bye, {NAME}!", farewellKo: "안녕!" },
        card,
        koMeaning: true,
      }),
    ).toEqual({ en: "Bye, {NAME}!", ko: "안녕!", source: "closing" });
    expect(farewellOf({ closing: null, card, koMeaning: true })).toEqual({
      en: card.farewell.en,
      ko: card.farewell.ko,
      source: "card",
    });
    expect(
      farewellOf({
        closing: { farewell: "", farewellKo: "" },
        card,
        koMeaning: false,
      }),
    ).toEqual({ en: card.farewell.en, source: "card" });
  });

  it("회화 정리: '한 번 더 말해 보기' 문장은 5단계부터 다음엔 이렇게 첫 줄(없으면 잘한 말 첫 줄), 4단계는 마지막 되풀이, 1~3단계는 없다", () => {
    const from = values["talk.feedback_from_level"] as number;
    const closing = {
      goodLines: ["Good one."],
      nextTimeLines: ["Better one."],
    };
    expect(
      againLineOf({
        spec: specOf(from),
        level: from,
        feedbackFromLevel: from,
        closing,
        recasts: ["R1.", "R2."],
      }),
    ).toBe("Better one.");
    expect(
      againLineOf({
        spec: specOf(from),
        level: from,
        feedbackFromLevel: from,
        closing: { goodLines: ["Good one."], nextTimeLines: [] },
        recasts: [],
      }),
    ).toBe("Good one.");
    expect(
      againLineOf({
        spec: specOf(from),
        level: from,
        feedbackFromLevel: from,
        closing: null,
        recasts: ["R1."],
      }),
    ).toBeNull();
    expect(
      againLineOf({
        spec: specOf(4),
        level: 4,
        feedbackFromLevel: from,
        closing,
        recasts: ["R1.", "R2.", ""],
      }),
    ).toBe("R2.");
    expect(
      againLineOf({
        spec: specOf(1),
        level: 1,
        feedbackFromLevel: from,
        closing,
        recasts: ["R1."],
      }),
    ).toBeNull();
  });
});

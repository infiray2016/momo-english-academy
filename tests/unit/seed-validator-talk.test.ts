import { describe, expect, it } from "vitest";
import type { SeedIssue } from "@/core/seed/check-lesson";
import { checkTalkCard, checkTalkUnit } from "@/core/seed/check-talk";
import { buildReferenceIndex } from "@/core/seed/reference-index";
import type { TalkLesson } from "@/core/seed/schema/lesson";
import type { TalkLevelSpec } from "@/core/seed/schema/reference";
import { lessonFilePath, TALK_SAME_QUESTION_MAX } from "@/core/seed/structure";
import {
  defaultSettings,
  referenceSet,
  settingNumber,
  talkLesson,
  talkUnitCards,
  unitWordsOf,
} from "../fixtures/seed/builders";

const ref = referenceSet(defaultSettings());
const { index } = buildReferenceIndex(ref);
const num = (key: string) => settingNumber(ref.settings, key);
const UNIT = 1;

function ctx(level: number) {
  return {
    area: "talk" as const,
    level,
    unit: UNIT,
    file: lessonFilePath("talk", level, UNIT),
    index,
  };
}
function check(lesson: TalkLesson, level: number): SeedIssue[] {
  return checkTalkCard(lesson, ctx(level));
}
const rulesOf = (issues: SeedIssue[]) =>
  [
    ...new Set(issues.filter((i) => i.severity === "error").map((i) => i.rule)),
  ].sort();
const has = (issues: SeedIssue[], rule: string) =>
  issues.some((i) => i.severity === "error" && i.rule === rule);

function card(level: 1 | 3 | 4 | 5): TalkLesson {
  return structuredClone(talkLesson(ref, level).lesson);
}
function specOf(level: number): TalkLevelSpec {
  const spec = index.levelSpec("talk", level);
  if (spec?.area !== "talk") throw new Error(`회화 ${level}단계 규격 없음`);
  return spec;
}
function turnsOf(lesson: TalkLesson) {
  const turns = lesson.card.turns;
  if (!turns) throw new Error("대화 턴이 없다");
  return turns;
}

describe("칸 검사: 회화 카드", () => {
  it("AC-15m 회화 1단계 카드: 인사 질문 수와 대화 턴 질문 수의 합이 목표 턴과 같으면 통과하고 하나 적으면 거부한다", () => {
    for (const level of [1, 3, 4, 5] as const) {
      expect(check(card(level), level), `${level}단계 견본`).toEqual([]);
    }
    const lesson = card(1);
    const spec = specOf(1);
    expect(lesson.card.greetingTurns + turnsOf(lesson).length).toBe(
      spec.targetTurns,
    );
    turnsOf(lesson).pop();
    expect(rulesOf(check(lesson, 1))).toEqual(["talk-turns"]);
  });

  it("AC-15m 회화 배정 카드: 처음 묻는 턴이 대화 토막 뒤쪽 절반에 있으면 거부한다", () => {
    const lesson = card(1);
    const turns = turnsOf(lesson);
    const firstAt = turns.findIndex((t) => t.ask === "first");
    const [first] = turns.splice(firstAt, 1);
    if (!first) throw new Error("처음 묻는 턴이 없다");
    turns.push(first);
    lesson.card.firstQuestion = turns[0]?.question.en ?? "";
    const issues = check(lesson, 1);
    expect(rulesOf(issues)).toEqual(["talk-first-ask"]);
  });

  it("AC-15m 회화 카드: 글자가 같은 토리 질문이 세 번이면 거부한다", () => {
    const lesson = card(1);
    const turns = turnsOf(lesson);
    const same = turns[0]?.question;
    if (!same) throw new Error("턴 없음");
    // 노리는 단어와 상관없는 질문 글을 앞 턴 셋에 똑같이 둔다.
    const repeated = { en: "What is your toy?", ko: "네 장난감은 뭐야?" };
    for (const turn of turns.slice(0, TALK_SAME_QUESTION_MAX)) {
      turn.question = { ...repeated };
    }
    lesson.card.firstQuestion = repeated.en;
    expect(has(check(lesson, 1), "talk-same-question")).toBe(false);
    const third = turns[TALK_SAME_QUESTION_MAX];
    if (!third) throw new Error("턴 없음");
    third.question = { ...repeated };
    expect(rulesOf(check(lesson, 1))).toEqual(["talk-same-question"]);
  });

  it("AC-15m 회화 1단계 카드: 답 두 개가 같은 꼴 문장이 아니면 거부한다", () => {
    const lesson = card(1);
    const turn = turnsOf(lesson)[0];
    if (!turn?.twoAnswers) throw new Error("답 두 개가 없다");
    turn.twoAnswers = [turn.twoAnswers[0], "I like it very much."];
    expect(rulesOf(check(lesson, 1))).toEqual(["talk-pairs"]);
    // 3단계(답 두 개를 두지 않는 단계)에 두어도 거부한다.
    const three = card(3);
    const t3 = turnsOf(three)[0];
    if (!t3) throw new Error("턴 없음");
    t3.twoAnswers = [t3.answerExample, t3.answerExample];
    expect(rulesOf(check(three, 3))).toEqual(["talk-pairs"]);
  });

  it("AC-15m 회화 3단계 카드: 영어 틀이 없는 턴을 거부한다", () => {
    const lesson = card(3);
    const turn = turnsOf(lesson)[2];
    if (!turn) throw new Error("턴 없음");
    delete turn.frameEn;
    const issues = check(lesson, 3);
    expect(rulesOf(issues)).toEqual(["talk-hints"]);
    expect(issues[0]?.path).toBe("card.turns.2.frameEn");
  });

  it("AC-15m 회화 카드: 카탈로그에 없는 그림 키를 거부한다", () => {
    const lesson = card(1);
    const turn = turnsOf(lesson)[0];
    if (!turn) throw new Error("턴 없음");
    turn.imageKey = "no-such-image";
    const issues = check(lesson, 1);
    expect(rulesOf(issues)).toEqual(["talk-images"]);
    expect(issues[0]?.path).toBe("card.turns.0.imageKey");
    // 그림을 두지 않는 단계(4단계 질문 목록 카드에는 칸이 없다)는 3단계에서 본다.
    expect(specOf(4).turnImages).toBe(false);
  });

  it("AC-15m 회화 카드: 토리 질문에 그 턴이 노리는 단원 단어가 있으면 거부한다", () => {
    const lesson = card(1);
    const turn = turnsOf(lesson)[1];
    const target = turn?.targets[0];
    if (!turn || !target) throw new Error("턴 없음");
    turn.question = { en: `Is it a ${target}?`, ko: "그거야?" };
    const issues = check(lesson, 1);
    expect(rulesOf(issues)).toEqual(["talk-targets"]);
    expect(issues[0]?.path).toBe("card.turns.1.question.en");
  });

  it("AC-15m 회화 1단계 단원: 한 주제 변형 정규 카드의 다시 묻는 턴 자리가 단원 단어 수 × talk.said_ratio × talk.known_days 보다 적으면 거부한다", () => {
    const cards = talkUnitCards(ref, 1);
    const frame = index.frame("talk", 1, UNIT);
    if (!frame) throw new Error("단원 틀 없음");
    expect(cards).toHaveLength(frame.regularLessons);
    for (const c of cards)
      expect(check(c, 1), `수업 ${c.lessonNo}`).toEqual([]);
    expect(checkTalkUnit(cards, ctx(1))).toEqual([]);
    const need =
      frame.vocabCount * num("talk.said_ratio") * num("talk.known_days");
    // 첫 수업 카드 하나만이면 다시 묻는 턴 자리가 모자란다.
    const first = cards.slice(0, 1);
    const slots = turnsOf(first[0] as TalkLesson).filter(
      (t) => t.ask === "re_ask",
    ).length;
    expect(slots).toBeLessThan(need);
    const issues = checkTalkUnit(first, ctx(1));
    expect(issues.map((i) => i.rule)).toContain("talk-again-slots");
  });

  it("AC-15m 회화 단원: 단원 단어 하나가 서로 다른 수업의 다시 묻는 턴에 talk.known_days 번 나오지 않으면 거부한다", () => {
    const cards = structuredClone(talkUnitCards(ref, 1));
    const [word, other] = unitWordsOf(ref, "talk", 1, UNIT);
    if (!word || !other) throw new Error("단원 단어 없음");
    // 첫 수업 밖의 다시 묻는 턴에서 그 단어를 다른 단어로 바꾼다.
    for (const c of cards.slice(1)) {
      for (const turn of turnsOf(c)) {
        if (turn.ask === "re_ask") {
          turn.targets = turn.targets.map((t) => (t === word ? other : t));
        }
      }
    }
    const issues = checkTalkUnit(cards, ctx(1)).filter(
      (i) => i.rule === "talk-known-days",
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain(word);
  });

  it("6.4 회화 시나리오 카드: 4단계 질문 목록이 목표 턴 − 인사 턴 수보다 적거나 영어 힌트 단 수가 다르면 거부한다", () => {
    const spec = specOf(4);
    const fewer = card(4);
    const questions = fewer.card.questions ?? [];
    expect(questions.length).toBeGreaterThanOrEqual(
      spec.targetTurns - fewer.card.greetingTurns,
    );
    fewer.card.questions = questions.slice(
      0,
      spec.targetTurns - fewer.card.greetingTurns - 1,
    );
    expect(rulesOf(check(fewer, 4))).toEqual(["talk-turns"]);
    const tiers = card(4);
    const q = tiers.card.questions?.[0];
    if (!q) throw new Error("질문 없음");
    q.hintTiers = q.hintTiers.slice(1);
    const issues = check(tiers, 4);
    expect(rulesOf(issues)).toEqual(["talk-hints"]);
    expect(issues[0]?.path).toBe("card.questions.0.hintTiers");
  });

  it("6.4 회화 시나리오 카드: {NAME} 밖의 틀 자리 · 5단계 미션 수 어긋남 · 1~4단계 한국어 뜻 빠짐을 거부한다", () => {
    const placeholder = card(4);
    if (!("firstLine" in placeholder.card.greeting))
      throw new Error("첫 말 없음");
    placeholder.card.greeting.firstLine.en = "Hi {CHILD}! How are you?";
    expect(rulesOf(check(placeholder, 4))).toEqual(["talk-placeholder"]);
    const missions = card(5);
    missions.card.missions = missions.card.missions?.slice(1);
    expect(rulesOf(check(missions, 5))).toEqual(["talk-missions"]);
    for (const level of [1, 4] as const) {
      const noKo = card(level);
      const line = noKo.card.closingLines[0];
      if (!line) throw new Error("정리 대사 없음");
      delete line.ko;
      const issues = check(noKo, level);
      expect(rulesOf(issues), `${level}단계`).toEqual(["talk-ko"]);
      expect(issues[0]?.path).toBe("card.closingLines.0.ko");
    }
    // 4단계 질문 목록 카드는 토리 첫 말의 한국어 뜻도 본다.
    const firstLine = card(4);
    if (!("firstLine" in firstLine.card.greeting))
      throw new Error("첫 말 없음");
    delete firstLine.card.greeting.firstLine.ko;
    expect(rulesOf(check(firstLine, 4))).toEqual(["talk-ko"]);
  });

  it("6.4 어휘 배정(회화): 새 단어가 아이 차례의 힌트 · 답 예시 · 쓸 수 있는 말 · 목표 표현에 없으면 거부한다", () => {
    const lesson = card(5);
    const [word] = lesson.newWords;
    const other = unitWordsOf(ref, "talk", 5, UNIT).find(
      (w) => !lesson.newWords.includes(w),
    );
    if (!word || !other) throw new Error("단어 없음");
    const swap = (text: string) =>
      text.replace(new RegExp(`\\b${word}\\b`, "g"), other);
    lesson.card.targetExpressions = lesson.card.targetExpressions.map(swap);
    lesson.card.questions = (lesson.card.questions ?? []).map((q) => ({
      ...q,
      targets: q.targets.map(swap),
      hintTiers: q.hintTiers.map(swap),
      usablePhrases: q.usablePhrases?.map(swap),
      answerExample: swap(q.answerExample),
    }));
    lesson.card.missions = lesson.card.missions?.map((m) => ({
      ...m,
      en: swap(m.en),
    }));
    // 오늘 쓸 말 예문(example)에만 남아 있으면 세지 않는다.
    expect(lesson.card.todayWords.some((w) => w.example.includes(word))).toBe(
      true,
    );
    const issues = check(lesson, 5).filter(
      (i) => i.rule === "vocab-allocation",
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain(word);
  });

  it("6.4 회화 시나리오 카드: 더 이야기할 거리가 talk.more_talk_turns 턴이 아니거나 이 대화에서 묻지 않은 단어를 노리면 거부한다", () => {
    const more = num("talk.more_talk_turns");
    const fewer = card(1);
    expect(fewer.card.moreTalk).toHaveLength(more);
    fewer.card.moreTalk = fewer.card.moreTalk?.slice(1);
    expect(rulesOf(check(fewer, 1))).toEqual(["talk-more"]);
    const unasked = card(1);
    const asked = new Set(turnsOf(unasked).flatMap((t) => t.targets));
    const outside = unitWordsOf(ref, "talk", 1, UNIT).find(
      (w) => !asked.has(w),
    );
    const first = unasked.card.moreTalk?.[0];
    if (!outside || !first) throw new Error("단어 없음");
    first.targets = [outside];
    const issues = check(unasked, 1).filter((i) => i.rule === "talk-more");
    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe("card.moreTalk.0.targets");
  });
});

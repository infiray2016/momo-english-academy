// 회화 수업 카드 기회(3.3 '남은 기회 알림' · 수업 끝 '셋을 가른다', 회화 plan 정한 것 7 · 18): 남은 목록 · 다룬 수 · 다 다룸 ·
// 돌아오기 알림 · 카드 자리에 붙일 가장 앞 기회 · 대신 질문 · 짧은 준비 낱말 고르기. 숫자는 시험용 설정에서 읽는다.
import { describe, expect, it } from "vitest";
import {
  oldestMoreOf,
  slotChanceOf,
  startPrepWordsOf,
  stuckPrepWordsOf,
  type TalkCarry,
  talkChancesOf,
} from "@/core/conversation/chances";
import type { TalkLessonTurn } from "@/core/conversation/lesson-turns";
import {
  cardQuestionKeyOf,
  questionKeyOf,
} from "@/core/conversation/question-check";
import {
  aiTurn,
  CARD3,
  LOW,
  NEW3,
  opening3,
  said,
  teacher,
} from "../fixtures/talk-lesson";

const NO_CARRY: TalkCarry = { goals: [], words: [] };

function chances(turns: TalkLessonTurn[], carry = NO_CARRY, missionsDone = 0) {
  return talkChancesOf({
    card: CARD3,
    newWords: NEW3,
    turns,
    carry,
    missionsDone,
    settings: LOW,
    prepWords: CARD3.prep ?? [],
  });
}

/** 기회를 다루지 않은 AI 차례(이어 묻기). */
const plainAi = (text: string) => aiTurn(text, { next: "follow_up" });

describe("남은 기회 목록", () => {
  it("AC-15r 대화 첫 질문 뒤: 남은 필수 질문 · 다시 쓰기 · 꺼낼 새 단어 차례, 이월은 맨 앞", () => {
    const c = chances(opening3(), { goals: ["talk-3-1-2"], words: ["rest"] });
    expect(c.carry).toEqual({ goals: ["talk-3-1-2"], words: ["rest"] });
    expect(c.required.map((r) => r.no)).toEqual([2, 3]);
    expect(c.required[0]?.targets).toEqual(["soccer"]);
    // play 는 필수 1 이 처음 물었으니 다시 쓰기가 talk.reask_per_word 만큼 남았다
    expect(c.reuse).toEqual(["play"]);
    // weekend 는 짧은 준비에 없고 아직 아무 질문도 노리지 않았다
    expect(c.introduce).toEqual(["weekend"]);
    expect(c.allDealt).toBe(false);
  });

  it("AC-15r 받침 줄(같은 질문 자리 안의 차례)은 다시 쓰기로 세지 않는다", () => {
    const turns = [
      ...opening3(),
      said({ input: "dont_know" }),
      teacher("That's okay! Let's say it together.", {
        kind: "card_slot",
        why: "support",
        stage: 1,
        item: { kind: "required", no: 1 },
        words: ["play"],
      }),
    ];
    expect(chances(turns).reuse).toEqual(["play"]);
  });

  it("AC-15r 꺼내기 · 다시 묻는 턴이 지나가면 목록에서 빠지고, 다 다루면 '다 다룸'", () => {
    const turns: TalkLessonTurn[] = [
      ...opening3(),
      said(),
      aiTurn("Cool! What do you do after school?", {
        next: "more",
        item: { kind: "more", no: 1 },
        words: ["play"],
      }),
      said(),
      aiTurn("Wow! What sport is fun?", {
        next: "required",
        item: { kind: "required", no: 2 },
        words: ["soccer"],
      }),
      said(),
      aiTurn("Nice! Who is your friend?", {
        next: "more",
        item: { kind: "more", no: 2 },
        words: ["soccer"],
      }),
      said(),
      aiTurn("Good! When is your free day?", {
        next: "required",
        item: { kind: "required", no: 3 },
        words: ["sunday"],
      }),
      said(),
      aiTurn("Sunday! What day is it today?", {
        next: "more",
        item: { kind: "more", no: 3 },
        words: ["sunday"],
      }),
      said(),
      aiTurn("A weekend is Saturday and Sunday. Say it with me!", {
        next: "introduce",
        intro: ["weekend"],
        words: ["weekend"],
      }),
    ];
    const half = chances(turns.slice(0, -1));
    expect(half.introduce).toEqual(["weekend"]);
    expect(half.allDealt).toBe(false);
    const c = chances(turns);
    expect(c.required).toEqual([]);
    expect(c.introduce).toEqual([]);
    // weekend 는 꺼낸 턴이 처음이라 다시 쓰기가 남는다
    expect(c.reuse).toEqual(["weekend"]);
    expect(c.allDealt).toBe(false);
    const done = chances([
      ...turns,
      said(),
      aiTurn("Do you like the weekend?", {
        next: "follow_up",
        words: ["weekend"],
      }),
    ]);
    expect(done.reuse).toEqual([]);
    expect(done.allDealt).toBe(true);
    // 학습 기회 제공: 필수 셋 + 새 단어 넷 × 다시 쓰기
    expect(done.prepared).toBe(
      CARD3.required.length + NEW3.length * LOW.reaskPerWord,
    );
    expect(done.offered).toBe(done.prepared);
  });

  it("AC-15r 미션은 해낸 수만큼 빠진다(5~7단계)", () => {
    const card = {
      ...CARD3,
      missions: [
        { ko: "가격 묻기", en: "Ask the price", goals: ["talk-3-1-1"] },
        { ko: "사기", en: "Buy it", goals: ["talk-3-1-1"] },
      ],
    };
    const c = talkChancesOf({
      card,
      newWords: NEW3,
      turns: opening3(),
      carry: NO_CARRY,
      missionsDone: 1,
      settings: LOW,
      prepWords: CARD3.prep ?? [],
    });
    expect(c.missions).toEqual([2]);
  });
});

describe("돌아오기 알림(talk.required_gap_turns)", () => {
  it("AC-15r 기회를 다루지 않은 AI 차례가 상한만큼 이어져야 알림이 든다", () => {
    const turns: TalkLessonTurn[] = [...opening3()];
    for (let i = 0; i < LOW.requiredGapTurns; i++) {
      expect(chances(turns).returnNudge).toBe(false);
      turns.push(said(), plainAi(`Wow ${i}! Really?`));
    }
    const c = chances(turns);
    expect(c.aiWithoutChanceRun).toBe(LOW.requiredGapTurns);
    expect(c.returnNudge).toBe(true);
  });

  it("AC-15r 기회를 다룬 차례가 끼면 셈이 다시 시작한다", () => {
    const turns: TalkLessonTurn[] = [...opening3()];
    for (let i = 0; i < LOW.requiredGapTurns - 1; i++)
      turns.push(said(), plainAi(`Wow ${i}! Really?`));
    turns.push(
      said(),
      aiTurn("What sport is fun?", {
        next: "required",
        item: { kind: "required", no: 2 },
        words: ["soccer"],
      }),
      said(),
      plainAi("Cool! Really?"),
    );
    expect(chances(turns).aiWithoutChanceRun).toBe(1);
    expect(chances(turns).returnNudge).toBe(false);
  });
});

describe("카드 자리에 붙일 기회(AC-15i 단위)", () => {
  it("AC-15i 남은 필수 질문이 먼저다(가장 앞 번호)", () => {
    expect(
      slotChanceOf({ card: CARD3, chances: chances(opening3()), blocked: [] }),
    ).toEqual({ kind: "required", no: 2 });
  });

  it("AC-15i 필수 질문이 다 다뤄지면 다시 쓰기가 남은 낱말을 노리는 더 이야기할 거리, 이월은 붙지 않는다", () => {
    const turns: TalkLessonTurn[] = [
      ...opening3(),
      said(),
      aiTurn("What sport is fun?", {
        next: "required",
        item: { kind: "required", no: 2 },
        words: ["soccer"],
      }),
      said(),
      aiTurn("When is your free day?", {
        next: "required",
        item: { kind: "required", no: 3 },
        words: ["sunday"],
      }),
    ];
    const c = chances(turns, { goals: [], words: ["rest"] });
    expect(c.required).toEqual([]);
    expect(slotChanceOf({ card: CARD3, chances: c, blocked: [] })).toEqual({
      kind: "more",
      no: 1,
    });
  });

  it("AC-15i 글이 막힌 질문 · 상한에 닿은 질문은 건너뛰고, 붙일 것이 없으면 null", () => {
    const c = chances(opening3());
    expect(
      slotChanceOf({
        card: CARD3,
        chances: c,
        blocked: [questionKeyOf("What sport is fun?")],
      }),
    ).toEqual({ kind: "required", no: 3 });
    const none = { ...c, required: [], reuse: [] };
    expect(
      slotChanceOf({ card: CARD3, chances: none, blocked: [] }),
    ).toBeNull();
  });

  it("AC-15i 대신 질문은 이 대화에서 가장 오래전에 쓴(안 쓴 것이 먼저) 더 이야기할 거리다", () => {
    const turns: TalkLessonTurn[] = [
      ...opening3(),
      said(),
      aiTurn("What do you do after school?", {
        next: "more",
        item: { kind: "more", no: 1 },
        words: ["play"],
      }),
      said(),
      aiTurn("Who is your friend?", {
        next: "more",
        item: { kind: "more", no: 2 },
        words: ["soccer"],
      }),
    ];
    expect(oldestMoreOf({ card: CARD3, turns, blocked: [] })).toEqual({
      kind: "more",
      no: 3,
    });
    const allUsed: TalkLessonTurn[] = [
      ...turns,
      said(),
      aiTurn("What day is it today?", {
        next: "more",
        item: { kind: "more", no: 3 },
        words: ["sunday"],
      }),
    ];
    expect(oldestMoreOf({ card: CARD3, turns: allUsed, blocked: [] })).toEqual({
      kind: "more",
      no: 1,
    });
    expect(
      oldestMoreOf({
        card: CARD3,
        turns: allUsed,
        blocked: [questionKeyOf("What do you do after school?")],
      }),
    ).toEqual({ kind: "more", no: 2 });
  });
});

describe("카드 항목 글을 실행 열쇠(마지막 물음표 문장)로 견줌(C172 · 장부 T-53)", () => {
  const scene = (no: number, en: string) => ({
    ...CARD3.more[0],
    no,
    en,
  });
  const card = {
    required: [],
    more: [
      scene(1, "You are thirsty. What do you do?"),
      scene(2, "You are tired. What do you want?"),
    ],
  };
  const chancesFor = { required: [], reuse: ["play"] };
  // 앱은 막힌 질문을 선생님 차례의 마지막 물음표 문장 열쇠로 든다(lesson-flow blocked)
  const blocked = [questionKeyOf("What do you do?")];

  it("AC-15m cardQuestionKeyOf 는 마지막 물음표 문장의 열쇠이고, 물음표 문장이 없으면 글 전체의 열쇠다", () => {
    expect(cardQuestionKeyOf("You are hungry. What do you do?")).toBe(
      questionKeyOf("What do you do?"),
    );
    expect(cardQuestionKeyOf("Tell me about your day.")).toBe(
      questionKeyOf("Tell me about your day."),
    );
  });

  it("AC-15i 막힌 질문과 꼬리가 같은 항목은 붙이지 않고, 꼬리가 다른 항목을 고른다", () => {
    expect(slotChanceOf({ card, chances: chancesFor, blocked })).toEqual({
      kind: "more",
      no: 2,
    });
    expect(oldestMoreOf({ card, turns: [], blocked })).toEqual({
      kind: "more",
      no: 2,
    });
  });

  it("AC-15i 같은 질문 상한도 꼬리 열쇠로 센다", () => {
    const asked = new Map([[questionKeyOf("What do you do?"), 2]]);
    expect(
      oldestMoreOf({ card, turns: [], blocked: [], asked, max: 2 }),
    ).toEqual({ kind: "more", no: 2 });
  });
});

describe("실제로 보인 짧은 준비 낱말 빼기(I-2)", () => {
  const base = {
    card: CARD3,
    newWords: NEW3,
    carry: NO_CARRY,
    missionsDone: 0,
    settings: LOW,
  };

  it("인사 뒤 준비를 하지 않았으면 카드 짧은 준비 낱말도 '꺼낼 새 단어' · 준비 후보에 든다", () => {
    const c = talkChancesOf({ ...base, turns: opening3(), prepWords: [] });
    expect(c.notIntroduced).toEqual(NEW3);
    expect(c.introduce).toEqual(["soccer", "sunday", "weekend"]);
  });

  it("대화 중 연 준비(move.prep)로 보인 낱말은 '꺼낼 새 단어' · 준비 후보에서 빠진다", () => {
    const turns: TalkLessonTurn[] = [
      ...opening3(),
      said({ input: "dont_know" }),
      teacher("Okay! Listen.", {
        kind: "card_slot",
        why: "support",
        stage: 3,
        app: ["answer_example", "prep"],
        prep: { words: ["weekend", "soccer"] },
      }),
    ];
    const c = talkChancesOf({ ...base, turns, prepWords: [] });
    expect(c.introduce).toEqual(["sunday"]);
    expect(c.notIntroduced).toEqual(["play", "sunday"]);
  });
});

describe("짧은 준비 낱말", () => {
  it("배정 수업은 카드 짧은 준비 낱말 그대로(talk.prep_words 개까지)", () => {
    expect(
      startPrepWordsOf({
        card: CARD3,
        carryWords: [],
        unitWords: [],
        known: [],
        count: LOW.prepWords,
      }),
    ).toEqual(["play", "soccer", "sunday"]);
  });

  it("다지기 · 보강은 이월 단어를 앞세워 아직 '안다'가 아닌 단원 단어로 채우고, 없으면 빈 목록", () => {
    const card = { ...CARD3, prep: undefined };
    expect(
      startPrepWordsOf({
        card,
        carryWords: ["rest", "play"],
        unitWords: ["play", "soccer", "sunday", "rest"],
        known: ["soccer"],
        count: LOW.prepWords,
      }),
    ).toEqual(["rest", "play", "sunday"]);
    expect(
      startPrepWordsOf({
        card,
        carryWords: [],
        unitWords: ["play"],
        known: ["play"],
        count: LOW.prepWords,
      }),
    ).toEqual([]);
  });

  it("대화 중 여는 준비는 막힌 질문이 노린 낱말을 앞세우고 아직 꺼내지 않은 새 단어로 채운다", () => {
    expect(
      stuckPrepWordsOf({
        stuckTargets: ["difficult", "rest"],
        pool: ["math", "difficult", "science"],
        count: 2,
      }),
    ).toEqual(["difficult", "math"]);
  });

  it("아직 꺼내지 않은 새 단어는 물은 낱말도 들고, 짧은 준비 · 꺼낸 낱말은 빠진다", () => {
    const turns: TalkLessonTurn[] = [
      ...opening3(),
      said(),
      aiTurn("Do you rest on the weekend?", {
        next: "follow_up",
        words: ["weekend"],
      }),
    ];
    const c = chances(turns);
    expect(c.introduce).toEqual([]);
    expect(c.notIntroduced).toEqual(["weekend"]);
    const after = chances([
      ...turns,
      said(),
      aiTurn("A weekend is fun. Say it with me!", {
        next: "introduce",
        intro: ["weekend"],
        words: ["weekend"],
      }),
    ]);
    expect(after.notIntroduced).toEqual([]);
  });
});

// 회화 수업 끝(3.3 '수업 끝' 참여 완료 · 끝난 길 표 · '대화가 멈추는 경우' 그만하기 행, 회화 plan 정한 것 6 · 12, 3.5 별 · 친한 정도).
// 참여가 거의 없음은 있음 · 없음의 사실이고 턴 수 문턱이 없다. 친한 정도 숫자는 시험용 설정에서 읽는다.
import { describe, expect, it } from "vitest";
import {
  talkEndOf,
  talkFriendshipAfter,
  talkNearlySilent,
  talkStopOf,
} from "@/core/conversation/ending";
import type { TalkLessonTurn } from "@/core/conversation/lesson-turns";
import {
  aiTurn,
  button,
  noSpeech,
  opening3,
  said,
  stuckSaid,
  teacher,
  values,
} from "../fixtures/talk-lesson";

const RULES = {
  per: values["talk.friendship_per_talk"] as number,
  max: values["talk.friendship_max"] as number,
};
const STORIES = 20;

/** 인사만 한 대화(대화 첫 질문까지). */
const greetingOnly = opening3();

describe("참여가 거의 없음", () => {
  it("AC-15t (나) 인사만 하고 대화 토막의 말 주고받기 턴이 0 이면 참여가 거의 없음이다", () => {
    expect(talkNearlySilent(greetingOnly)).toBe(true);
  });

  it("AC-15t (나) 대화 토막에서 말로 한 턴이라도 있으면 참여가 거의 없음이 아니다", () => {
    expect(talkNearlySilent([...greetingOnly, said()])).toBe(false);
    expect(
      talkNearlySilent([...greetingOnly, said({ segment: "more_talk" })]),
    ).toBe(false);
  });

  it("AC-15t 막힌 차례 · 들리지 않음 · 한국어 질문 턴만 있으면 여전히 참여가 거의 없음이다", () => {
    const turns: TalkLessonTurn[] = [
      ...greetingOnly,
      button(),
      aiTurn("That's okay!"),
      stuckSaid(),
      aiTurn("Let's try."),
      noSpeech(),
      aiTurn("I couldn't hear you."),
      said({ koQuestion: true }),
    ];
    expect(talkNearlySilent(turns)).toBe(true);
  });
});

describe("끝난 길(3.3 표)", () => {
  it("AC-15t 마무리 물음에 답하고 끝내면(끝난 길 표 첫 줄) 참여 완료 · 별 1 · 친한 정도", () => {
    expect(talkEndOf({ path: "closing_question" })).toEqual({
      outcome: "completed",
      reason: "closing_question",
      stars: 1,
      friendship: true,
    });
  });

  it("바닥선으로 정리에 가면 참여 완료다", () => {
    expect(talkEndOf({ path: "floor" })).toMatchObject({
      outcome: "completed",
      reason: "floor",
      stars: 1,
    });
  });

  it("AC-15t (가) 말로 대화한 뒤 카드 기회가 남은 채 '그만하기'를 고르면 확인 없이 참여 완료다", () => {
    const turns: TalkLessonTurn[] = [...greetingOnly];
    for (let i = 0; i < 8; i++)
      turns.push(said(), aiTurn(`Nice ${i}! Really?`));
    expect(
      talkStopOf({ turns, closingAnswered: false, suggestion: false }),
    ).toEqual({
      outcome: "completed",
      reason: "stop",
      stars: 1,
      friendship: true,
    });
  });

  it("AC-15t (다) 마무리 제안 뒤 '그만하기'는 '그만하기'와 같이 다루고 까닭은 suggestion 이다", () => {
    const turns = [
      ...greetingOnly,
      said(),
      aiTurn("We talked a lot! Shall we finish?", { next: "closing" }),
    ];
    expect(
      talkStopOf({ turns, closingAnswered: false, suggestion: true }),
    ).toMatchObject({
      outcome: "completed",
      reason: "suggestion",
    });
  });

  it("AC-15t (나) 참여가 거의 없을 때만 '그만하기'가 확인 쪽지를 묻고, 확인하면 중단 · 별 없음, 취소하면 대화를 잇는다", () => {
    expect(
      talkStopOf({
        turns: greetingOnly,
        closingAnswered: false,
        suggestion: false,
      }),
    ).toEqual({
      outcome: "confirm",
      reason: null,
      stars: 0,
      friendship: false,
    });
    expect(talkEndOf({ path: "stop_confirmed" })).toEqual({
      outcome: "aborted",
      reason: "stop_confirmed",
      stars: 0,
      friendship: false,
    });
    expect(talkEndOf({ path: "stop_cancelled" })).toMatchObject({
      outcome: "continue",
      stars: 0,
    });
  });

  it("AC-15t 마무리 물음에 답한 뒤(더 이야기하기)의 '그만하기'는 참여 완료이고 까닭은 closing_question 이다", () => {
    expect(
      talkStopOf({
        turns: greetingOnly,
        closingAnswered: true,
        suggestion: false,
      }),
    ).toMatchObject({
      outcome: "completed",
      reason: "closing_question",
    });
  });

  it("AC-15t 참여 완료 전에 앱을 닫음 · '홈' · 'AI 쉬는 중'은 끝나지 않고 진행으로 남는다", () => {
    expect(talkEndOf({ path: "interrupted" })).toEqual({
      outcome: "in_progress",
      reason: null,
      stars: 0,
      friendship: false,
    });
  });
});

describe("친한 정도(3.5 · talk.friendship_per_talk)", () => {
  const state = {
    friendship: 3,
    opened: 0,
    storiesInBand: STORIES,
    isRetry: false,
  };

  it("AC-16a 참여 완료한 수업만 친한 정도가 1칸 오른다", () => {
    const done = talkEndOf({ path: "floor" });
    expect(talkFriendshipAfter(done, state, RULES)).toEqual({
      friendship: 3 + RULES.per,
      opened: 0,
      unlocked: null,
    });
    const aborted = talkEndOf({ path: "stop_confirmed" });
    expect(talkFriendshipAfter(aborted, state, RULES)).toEqual({
      friendship: 3,
      opened: 0,
      unlocked: null,
    });
  });

  it("AC-16a 다시 하기는 참여 완료여도 그대로다", () => {
    const done = talkEndOf({ path: "closing_question" });
    expect(
      talkFriendshipAfter(done, { ...state, isRetry: true }, RULES).friendship,
    ).toBe(3);
  });
});

describe("그 밖", () => {
  it("인사 토막의 말 턴은 참여에 들지 않는다", () => {
    const turns: TalkLessonTurn[] = [
      teacher("Hi! How are you today?", { kind: "first_question" }),
      said({ segment: "greeting" }),
      teacher("Great! Do you like Sunday?", { kind: "card_slot" }),
      said({ segment: "greeting_end" }),
    ];
    expect(talkNearlySilent(turns)).toBe(true);
  });
});

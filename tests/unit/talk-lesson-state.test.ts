// 회화 수업 새 흐름의 서버 상태 · 기록 순수 몫(회화 plan 묶음 7 — talk_turns 행 → 흐름 꼴(move 읽기) · tori_ko 저장 조건(정한 것 9) ·
// 끝맺음 기록의 까닭(정한 것 6)). DB 를 거치는 상태 읽기는 통합 시험(tests/integration/talk-lesson-state.test.ts, 정적)이 본다.
import { describe, expect, it } from "vitest";
import { talkEndOf } from "@/core/conversation/ending";
import { talkMoveOf } from "@/core/conversation/move";
import { lessonClosingOf } from "@/server/conversation/closing";
import {
  lessonToriKoOf,
  lessonTurnOf,
  type TalkTurnRow,
} from "@/server/conversation/state";

const AT = new Date("2026-10-30T10:00:00+09:00");

function row(over: Partial<TalkTurnRow>): TalkTurnRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    sessionId: "00000000-0000-4000-8000-000000000002",
    turnNo: 1,
    segment: "talk",
    clientAttemptId: null,
    speaker: "child",
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
    recordedAt: AT,
    ...over,
  };
}

describe("talk_turns 행 → 흐름 꼴(새 갈래 상태 읽기)", () => {
  it("아이 행: 입력 방식 · 막힘 말 · 들리지 않음(client_listen 출처 nospeech) · 노린 단어 · 토막을 옮긴다", () => {
    expect(
      lessonTurnOf(
        row({
          speaker: "child",
          segment: "greeting",
          inputMode: "speech",
          targetWords: ["play"],
        }),
      ),
    ).toEqual({
      speaker: "child",
      segment: "greeting",
      input: "speech",
      stuck: false,
      nospeech: false,
      targets: ["play"],
    });
    expect(
      lessonTurnOf(
        row({
          inputMode: "speech",
          stuckPhrase: "I don't know",
          segment: "more_talk",
        }),
      ),
    ).toMatchObject({ segment: "more_talk", stuck: true, nospeech: false });
    expect(
      lessonTurnOf(
        row({ inputMode: "dont_know", clientListen: { src: "nospeech" } }),
      ),
    ).toMatchObject({ input: "dont_know", nospeech: true });
    expect(
      lessonTurnOf(
        row({ inputMode: "dont_know", clientListen: { src: "button" } }),
      ),
    ).toMatchObject({ input: "dont_know", nospeech: false });
    // 입력 방식이 빈 옛 행은 말로 본다(옛 갈래 liteOf 와 같다)
    expect(lessonTurnOf(row({}))).toMatchObject({ input: "speech" });
  });

  it("아이 행의 되물음 표지(talk_turns.ask_again, 13절 C218 · 5절 04:35): 참인 행만 흐름 꼴에 askAgain 칸이 있고, 빈 옛 행 · 거짓 행은 칸이 없다", () => {
    const asked = lessonTurnOf(
      row({ inputMode: "speech", askAgain: true, stuckPhrase: null }),
    );
    expect(asked).toEqual({
      speaker: "child",
      segment: "talk",
      input: "speech",
      stuck: false,
      nospeech: false,
      targets: [],
      askAgain: true,
    });
    for (const askAgain of [null, false])
      expect(
        "askAgain" in lessonTurnOf(row({ inputMode: "speech", askAgain })),
      ).toBe(false);
    // 선생님 행에는 표지를 싣지 않는다(아이 행의 칸이다)
    expect(
      "askAgain" in
        lessonTurnOf(row({ speaker: "tori", text: "Hi!", askAgain: true })),
    ).toBe(false);
  });

  it("AC-15v 선생님 행: text 는 화면 글 줄 그대로, move 는 꼴을 읽고(틀리거나 비면 null), 답 예시는 AI 질문의 답 예시다", () => {
    const move = talkMoveOf({
      kind: "card_slot",
      why: "question_check",
      item: { kind: "required", no: 2 },
      words: ["soccer"],
      sound: { model: "I play soccer." },
    });
    expect(
      lessonTurnOf(
        row({
          speaker: "tori",
          text: "Wow, fun!\nWhat do you do on Sunday?",
          move,
          aiQuestion: {
            en: "What do you do?",
            ko: "뭐 해?",
            answerExample: "I play soccer.",
          },
        }),
      ),
    ).toEqual({
      speaker: "teacher",
      text: "Wow, fun!\nWhat do you do on Sunday?",
      move,
      answerExample: "I play soccer.",
    });
    expect(
      lessonTurnOf(row({ speaker: "tori", text: null, move: { v: 9 } })),
    ).toEqual({
      speaker: "teacher",
      text: "",
      move: null,
      answerExample: null,
    });
  });
});

describe("tori_ko 저장 조건(정한 것 9)", () => {
  const sent = ["Wow!", "What do you play?"];
  it("뜻을 보이는 단계(koMeaning, 1~4단계)는 저장하고, 그 밖은 저장하지 않는다", () => {
    const four = { band: "4-6" as const, koMeaning: true };
    const five = { band: "4-6" as const, koMeaning: false };
    // 4단계는 1~3단계 겹침 규칙을 받지 않는다(문장이 빠져도 저장)
    expect(
      lessonToriKoOf({ ko: "와! 뭐 해?", spec: four, sent, shown: ["Wow!"] }),
    ).toBe("와! 뭐 해?");
    expect(
      lessonToriKoOf({ ko: "와! 뭐 해?", spec: five, sent, shown: sent }),
    ).toBeNull();
    expect(
      lessonToriKoOf({ ko: "", spec: four, sent, shown: sent }),
    ).toBeNull();
    expect(
      lessonToriKoOf({ ko: null, spec: four, sent, shown: sent }),
    ).toBeNull();
  });

  it("1~3단계는 겹침 규칙(toriKoShownOf)을 그대로 따른다: 선생님 문장이 빠진 차례는 뜻을 저장하지 않는다", () => {
    const three = { band: "1-3" as const, koMeaning: true };
    expect(
      lessonToriKoOf({ ko: "와! 뭐 해?", spec: three, sent, shown: sent }),
    ).toBe("와! 뭐 해?");
    expect(
      lessonToriKoOf({ ko: "와! 뭐 해?", spec: three, sent, shown: ["Wow!"] }),
    ).toBeNull();
  });
});

describe("끝맺음 기록의 까닭(정한 것 6 · 3.3 끝맺음 턴 행)", () => {
  it("AC-16a 참여 완료 끝(마무리 물음 · 마무리 제안 · 바닥선 · 구석 그만하기)은 친한 정도가 오르는 끝이고, 그 까닭으로 끝맺음 대기 기록을 넣고 응답 뒤에 부른다", () => {
    for (const path of [
      "closing_question",
      "suggestion",
      "floor",
      "stop",
    ] as const) {
      const end = talkEndOf({ path });
      expect(end).toMatchObject({ outcome: "completed", friendship: true });
      expect(lessonClosingOf(end, { resting: false })).toEqual({
        reason: path,
        skipped: false,
        schedule: true,
      });
    }
  });

  it("AC-16a 확인 쪽지 뒤 그만두기는 친한 정도가 오르지 않는 중단이고 stop_confirmed 로 기록하며, 'AI 쉬는 중'이면 끝맺음 없이 닫는다(참여 완료 끝은 대기 기록만)", () => {
    expect(talkEndOf({ path: "stop_confirmed" })).toMatchObject({
      outcome: "aborted",
      friendship: false,
    });
    expect(
      lessonClosingOf(talkEndOf({ path: "stop_confirmed" }), {
        resting: false,
      }),
    ).toEqual({ reason: "stop_confirmed", skipped: false, schedule: true });
    expect(
      lessonClosingOf(talkEndOf({ path: "stop_confirmed" }), { resting: true }),
    ).toEqual({ reason: "stop_confirmed", skipped: true, schedule: false });
    expect(
      lessonClosingOf(talkEndOf({ path: "floor" }), { resting: true }),
    ).toEqual({ reason: "floor", skipped: false, schedule: false });
  });

  it("끝나지 않은 길(확인 쪽지 묻기 · 취소 · 진행)은 끝맺음 기록이 없다", () => {
    expect(
      lessonClosingOf(talkEndOf({ path: "stop_cancelled" }), {
        resting: false,
      }),
    ).toBeNull();
    expect(
      lessonClosingOf(talkEndOf({ path: "interrupted" }), { resting: false }),
    ).toBeNull();
    expect(
      lessonClosingOf({ outcome: "confirm", reason: null }, { resting: false }),
    ).toBeNull();
  });
});

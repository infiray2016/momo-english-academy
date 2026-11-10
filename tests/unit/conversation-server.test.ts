// 회화 세션 서버의 DB 없는 공용 몫(plan-p13b 파일별 값 1 · 2 · 3 · 회화 plan 묶음 12): 선생님 행 원문 꼴 · 턴 차례 · 끝맺음 상태 · 앞 턴 짝 ·
// 끝맺음 기록 꼴, 옛 꼴 카드 닫기(정한 것 2 — 세션 닫는 꼴 · 수업 목록 칸 후보). 옛 흐름 몫(가벼운 꼴 네 칸 · 흘려 보낼 옛 줄 · 결과 → 토리 행 ·
// 옛 아이 행)은 묶음 12 가 옛 갈래와 함께 지웠다 — 새 꼴 아이 행(C149 · AC-16b)은 talk-lesson-turn 시험이 본다. 통합 시험은 CI 가 돈다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseTalkAttemptInput,
  TALK_CLOSING_REASONS,
} from "@/core/conversation/attempt";
import {
  CLOSING_FAILURES_TO_GIVE_UP,
  closingStateOf,
  nextClosingState,
} from "@/server/conversation/closing";
import { oldTalkCloseOf } from "@/server/conversation/index";
import {
  historyOf,
  openingLineOf,
  sortTurns,
  splitOrphan,
  type TalkTurnRow,
  toriLinesOf,
  toriTextOf,
} from "@/server/conversation/state";
import { listableLessonsOf } from "@/server/lesson-list";

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
    askAgain: null,
    move: null,
    recordedAt: new Date("2026-10-22T10:00:00Z"),
    ...over,
  };
}

describe("선생님 행 원문 · 턴 차례", () => {
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

describe("끝맺음 상태 · 앞 턴 짝 · 끝맺음 기록 꼴", () => {
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
});

describe("옛 꼴 카드 닫기(회화 plan 정한 것 2 · 위험 14)", () => {
  it("옛 꼴 카드 세션은 진행이면 중단(끝맺음 기록 까닭 aborted), 완료이고 열린 대화면 정리로만 닫는다(까닭 idle) — 둘 다 끝맺음을 부르지 않는다", () => {
    expect(oldTalkCloseOf("in_progress")).toEqual({
      aborted: true,
      reason: "aborted",
    });
    expect(oldTalkCloseOf("completed")).toEqual({
      aborted: false,
      reason: "idle",
    });
  });

  it("회화 수업 목록의 칸 후보는 새 꼴 카드 수업뿐이고(옛 꼴 · 틀린 카드는 뺌) 다른 영역은 그대로다", () => {
    const oldCard = { content: { card: { topic: "x", firstQuestion: "Hi?" } } };
    const broken = { content: { card: { topic: "x" } } };
    const none = { content: null };
    expect(listableLessonsOf("talk", [oldCard, broken, none])).toEqual([]);
    // 실시드 3단계 단원 1 수업(새 꼴 카드)은 남는다
    const real = JSON.parse(
      readFileSync(join(process.cwd(), "seed/lessons/talk/3/1.json"), "utf8"),
    ) as { lessons: { card: unknown }[] };
    const fresh = real.lessons.map((lesson) => ({ content: lesson }));
    expect(fresh.length).toBeGreaterThan(0);
    expect(listableLessonsOf("talk", [...fresh, oldCard])).toEqual(fresh);
    expect(listableLessonsOf("reading", [oldCard, broken, none])).toEqual([
      oldCard,
      broken,
      none,
    ]);
  });
});

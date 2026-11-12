// 새 회화 엔진 한 차례 판단의 단위 시험(spec '회화 Claude 주도' 설계 1 · 2 · 3 · 6 · 8, plan 묶음 S1 — 서버 턴 길과 대본 도구가 같이 쓰는 순수 몫,
// NFR-4). 통합 시험(tests/integration/talk-lead-turn.test.ts)이 DB 길을 덮고, 여기서는 갈림 · 사실 값 · 대화 기록 · 흘려 받는 동안 붙잡을 문장 ·
// 끝에서 낼 글과 소리 줄 · 좁은 정의 다시 말하기 규격을 DB 없이 본다.
import { describe, expect, it } from "vitest";
import {
  TALK_LEAD_TEXT_L3U1,
  type TalkLeadInput,
  talkLeadGoalWordsSaidOf,
} from "@/core/ai/calls/talk-lead";
import {
  parseTalkAttemptInput,
  TALK_CLOSING_ACTIVITY_NO,
  talkClosingAttemptId,
  talkStartAttemptId,
} from "@/core/conversation/attempt";
import type { LeadNarrowHit } from "@/core/conversation/lead-level";
import { leadAskAgainFloorOf } from "@/core/conversation/lead-record";
import {
  createLeadSentenceFlow,
  LEAD_NARROW_RECORD_TAG,
  LEAD_OPEN_ACTIVITY_NO,
  LEAD_OPEN_INPUT,
  LEAD_RECORD_TAG,
  leadAiQuestionOf,
  leadAskAgainFloorApplies,
  leadChildHelpAfterOf,
  leadChildHelpOfRow,
  leadChildOf,
  leadChildStuckOf,
  leadChildTurnOf,
  leadClosingAddsOf,
  leadClosingTurnOf,
  leadFirstTurnOf,
  leadGateOf,
  leadGreetingOf,
  leadHelpCountsOf,
  leadHistoryOf,
  leadHoldSayOf,
  leadLastModelOf,
  leadMoveWithSound,
  leadNarrowTargetOf,
  leadOpenAcceptsOf,
  leadOpenAttemptId,
  leadOpenChildOf,
  leadOpenReplayOf,
  leadSettleOf,
  leadSoundNotesFor,
  leadStartModeOf,
  leadStatusOf,
  leadTurnAppliesOf,
  leadWrapRecastsOf,
  TALK_LEAD_RETRY_TITLE,
  talkLeadRetrySpec,
} from "@/core/conversation/lead-turn-core";
import {
  type TalkLead,
  type TalkMove,
  talkMoveOf,
} from "@/core/conversation/move";
import { parseAttemptInput } from "@/core/session/attempt";
import { lessonWrapSourcesOf } from "@/server/conversation";
import { lessonWrapLinesOf } from "@/server/conversation/lesson-turn";

const leadOf = (over: Partial<TalkLead> = {}): TalkLead => ({
  reading: "clear_answer",
  move: "react_and_follow_up",
  asked: [],
  said: [],
  ...over,
});
const leadMove = (over: Partial<TalkLead> = {}): TalkMove =>
  talkMoveOf({ kind: "ai", lead: leadOf(over) });

/** 'summer' · 'winter' 를 좁은 정의에 거는 가짜 검사(실제 검사는 묶음 R4 시험이 본다). */
const hitsOf = (sentence: string): LeadNarrowHit[] =>
  /\bsummer\b|\bwinter\b/i.test(sentence)
    ? [{ kind: "choice", text: "summer" }]
    : [];
const noHits = (): LeadNarrowHit[] => [];

describe("갈림(spec 설계 1)", () => {
  const base = { segment: "talk", level: 3 };

  it("AC-26a 방식은 처음 스냅숏 값만 본다: 스냅숏 claude · 지금 설정 app 이면 새 엔진, 스냅숏 없음 · 설정 claude 면 지금 길(상태의 두 방식 값 구분, 묶음 M 검토 M-3)", () => {
    expect(
      leadTurnAppliesOf({
        ...base,
        start: { leadMode: "claude" },
        settings: { leadMode: "app" },
      }),
    ).toBe(true);
    expect(
      leadTurnAppliesOf({
        ...base,
        start: {},
        settings: { leadMode: "claude" },
      }),
    ).toBe(false);
    expect(
      leadTurnAppliesOf({
        ...base,
        start: null,
        settings: { leadMode: "claude" },
      }),
    ).toBe(false);
    expect(leadTurnAppliesOf({ ...base, start: { leadMode: "app" } })).toBe(
      false,
    );
  });

  it("AC-26a 세션 판단은 isLeadSession(1~3단계)이고 S1 은 토막만 더한다: 인사 · 짧은 준비 · 정리 토막과 4단계부터는 지금 길이다", () => {
    const start = { leadMode: "claude" };
    expect(leadTurnAppliesOf({ ...base, start, segment: "more_talk" })).toBe(
      true,
    );
    expect(leadTurnAppliesOf({ ...base, start, level: 1 })).toBe(true);
    for (const segment of ["greeting", "prep", "wrap_up"])
      expect(leadTurnAppliesOf({ ...base, start, segment })).toBe(false);
    expect(leadTurnAppliesOf({ ...base, start, level: 4 })).toBe(false);
  });
});

describe("처음 스냅숏에 적을 방식(13절 C241 보완 · 검토 rev-s1 I-2)", () => {
  const withText = () => TALK_LEAD_TEXT_L3U1;

  it("AC-26a 설정 claude · 1~3단계 · 그 단원의 안내문 글이 모두 설 때만 claude 이고, 하나라도 서지 않으면 지금 방식(app)이다", () => {
    // 지금 안내문 글이 있는 단원은 회화 3단계 단원 1 하나다(talkLeadTextOf)
    expect(leadStartModeOf({ mode: "claude", level: 3, unit: 1 })).toBe(
      "claude",
    );
    expect(leadStartModeOf({ mode: "claude", level: 3, unit: 2 })).toBe("app");
    expect(leadStartModeOf({ mode: "claude", level: 1, unit: 1 })).toBe("app");
    expect(leadStartModeOf({ mode: "app", level: 3, unit: 1 })).toBe("app");
    // 글이 있어도 구간 밖(4단계부터)은 지금 방식이다
    expect(
      leadStartModeOf({
        mode: "claude",
        level: 4,
        unit: 1,
        leadText: withText,
      }),
    ).toBe("app");
    expect(
      leadStartModeOf({
        mode: "claude",
        level: 1,
        unit: 1,
        leadText: withText,
      }),
    ).toBe("claude");
    expect(
      leadStartModeOf({ mode: "app", level: 1, unit: 1, leadText: withText }),
    ).toBe("app");
    expect(
      leadStartModeOf({
        mode: "claude",
        level: 2,
        unit: 3,
        leadText: () => null,
      }),
    ).toBe("app");
  });
});

describe("대화 토막의 첫 차례(검토 rev-s1 M-1)", () => {
  const row = (over: Record<string, unknown>) => ({
    speaker: "tori" as const,
    turnNo: 1,
    segment: "greeting",
    text: "Hi!",
    ...over,
  });

  it("AC-26c 첫 차례는 대화 토막의 선생님 행이 없을 때뿐이다: 입구 차례가 실패해 기록 쌍이 비어도 다음 차례에 인사 이음을 다시 싣지 않는다", () => {
    expect(leadFirstTurnOf([])).toBe(true);
    expect(leadFirstTurnOf([row({}), row({ segment: "prep" })])).toBe(true);
    // 입구 start 가 실패해 카드 안전한 대사로 닫은 행(move.lead · tori_rewrite 없음)
    const failed = row({
      turnNo: 3,
      segment: "talk",
      move: talkMoveOf({ kind: "first_question" }),
      toriRewrite: null,
    });
    expect(leadHistoryOf([row({}), failed])).toEqual([]);
    expect(leadFirstTurnOf([row({}), failed])).toBe(false);
    expect(
      leadFirstTurnOf([row({}), row({ turnNo: 5, segment: "more_talk" })]),
    ).toBe(false);
    // 아이 행만 대화 토막이면 아직 첫 차례다(선생님 차례가 없음)
    expect(
      leadFirstTurnOf([
        row({}),
        { ...row({ segment: "talk" }), speaker: "child" },
      ]),
    ).toBe(true);
  });
});

describe("아이 말 없이 부르는 입구(검토 rev-s2 I-2)", () => {
  it("AC-26c 겹친 요청 막기 표지는 세션 · 차례마다 하나이고 처음 스냅숏 · 끝맺음 기록 id 와 겹치지 않는다(검토 rev-s1 I-3)", () => {
    const sid = "00000000-0000-4000-8000-000000000001";
    expect(leadOpenAttemptId(sid, 7)).toBe(`talk-lead-open:${sid}:7`);
    expect(leadOpenAttemptId(sid, 8)).not.toBe(leadOpenAttemptId(sid, 7));
    expect(leadOpenAttemptId(sid, 7)).not.toBe(talkStartAttemptId(sid));
    expect(leadOpenAttemptId(sid, 7)).not.toBe(talkClosingAttemptId(sid));
    expect(LEAD_OPEN_ACTIVITY_NO).toBe(TALK_CLOSING_ACTIVITY_NO);
    // 표지 행의 input 은 kind 가 드러나지만 회화 · 학습 시도 읽기의 꼴 검사에서 읽히지 않는다(어디에도 닿지 않음)
    expect(LEAD_OPEN_INPUT.kind).toBe("talk-lead-open");
    expect(parseTalkAttemptInput(LEAD_OPEN_INPUT)).toBeUndefined();
    expect(parseAttemptInput(LEAD_OPEN_INPUT)).toBeUndefined();
  });

  it("AC-26c start 는 대화 첫 질문 차례에만, more 는 더 이야기하기를 고른 뒤(마무리 물음이면 더 이야기하기 토막)에만 받는다", () => {
    const at = (over: Partial<Parameters<typeof leadOpenAcceptsOf>[1]>) => ({
      segment: "talk",
      firstQuestionDue: false,
      choice: null,
      ...over,
    });
    expect(leadOpenAcceptsOf("start", at({ firstQuestionDue: true }))).toBe(
      true,
    );
    expect(leadOpenAcceptsOf("start", at({}))).toBe(false);
    expect(
      leadOpenAcceptsOf(
        "start",
        at({ firstQuestionDue: true, segment: "greeting" }),
      ),
    ).toBe(false);
    expect(
      leadOpenAcceptsOf(
        "more",
        at({ choice: "closing", segment: "more_talk" }),
      ),
    ).toBe(true);
    expect(leadOpenAcceptsOf("more", at({ choice: "closing" }))).toBe(false);
    expect(leadOpenAcceptsOf("more", at({ choice: "suggestion" }))).toBe(true);
    expect(leadOpenAcceptsOf("more", at({}))).toBe(false);
    expect(leadOpenChildOf("start")).toBeNull();
    expect(leadOpenChildOf("more")).toEqual({ kind: "more_talk" });
  });

  it("AC-26c 같은 입구를 다시 보내면 그 입구가 쓴 행(사용자 메시지를 행에 둔 새 엔진 행)만 다시 흘린다", () => {
    const opened = {
      speaker: "tori" as const,
      sentUserMessage: "U",
      move: talkMoveOf({ kind: "first_question", lead: leadOf() }),
    };
    expect(leadOpenReplayOf("start", opened)).toBe(true);
    expect(leadOpenReplayOf("more", opened)).toBe(false);
    expect(leadOpenReplayOf("more", { ...opened, move: leadMove() })).toBe(
      true,
    );
    // 아이 차례 뒤 행(사용자 메시지는 아이 행에 있음) · 지금 길 행은 다시 흘리지 않는다
    expect(
      leadOpenReplayOf("start", { ...opened, sentUserMessage: null }),
    ).toBe(false);
    expect(
      leadOpenReplayOf("start", {
        ...opened,
        move: talkMoveOf({ kind: "first_question" }),
      }),
    ).toBe(false);
  });
});

describe("사실 알림의 값(spec 설계 2)", () => {
  it("AC-26b 아이 입력 줄은 들린 글 · 단추 · 말소리 없음 세 꼴이다", () => {
    expect(
      leadChildOf({ mode: "speech", nospeech: false, heard: "See." }),
    ).toEqual({ kind: "speech", heard: "See." });
    expect(
      leadChildOf({ mode: "dont_know", nospeech: false, heard: "" }),
    ).toEqual({
      kind: "dont_know",
    });
    expect(
      leadChildOf({ mode: "dont_know", nospeech: true, heard: "" }),
    ).toEqual({
      kind: "silent",
    });
  });

  it("AC-26b 'Child turn' 줄: 대화 토막 아이 차례 번호(이번 포함)와 앱이 마무리를 묻는 차례", () => {
    const rows = [
      { speaker: "child" as const, segment: "greeting" },
      { speaker: "tori" as const, segment: "talk" },
      { speaker: "child" as const, segment: "talk" },
      { speaker: "child" as const, segment: "talk" },
    ];
    expect(leadChildTurnOf({ rows, turnsLeft: 4 })).toEqual({
      n: 3,
      offerAt: 6,
    });
    // 이미 닿았으면 이 차례다
    expect(leadChildTurnOf({ rows, turnsLeft: 0 })).toEqual({
      n: 3,
      offerAt: 3,
    });
  });

  it("AC-26b 도움 기록: 새 엔진 행의 쉬운 질문 · 고르기 · 따라 할 문장만 센다", () => {
    expect(
      leadHelpCountsOf([
        talkMoveOf({ kind: "ai", ai: "model_line" }),
        leadMove({ move: "easier_or_choices" }),
        leadMove({ move: "easier_or_choices", choices: true }),
        leadMove({
          move: "model_repeat",
          model: { sentence: "I see the sea.", inSay: true },
        }),
        leadMove({ move: "react_only" }),
        null,
      ]),
    ).toEqual({ easierQuestion: 1, choices: 1, modelSentence: 1 });
  });

  it("AC-26b 앞 차례 따라 할 문장은 말 칸에 그대로 든 것만 알린다", () => {
    expect(
      leadLastModelOf(
        leadMove({ model: { sentence: "I see the sea.", inSay: true } }),
      ),
    ).toBe("I see the sea.");
    expect(
      leadLastModelOf(
        leadMove({ model: { sentence: "I see the sea.", inSay: false } }),
      ),
    ).toBeUndefined();
    expect(leadLastModelOf(null)).toBeUndefined();
  });

  it("AC-26c 'See.'(질문 sea)는 see · sea 가 둘 다 단원 단어여도 소리 귀띔이 나간다(묶음 R1 확인할 것 5)", () => {
    const common = {
      unitWords: ["see", "sea", "go", "beach"],
      homophones: [["see", "sea"]],
      soundAlikes: [],
      lemmaOf: () => undefined,
    };
    expect(
      leadSoundNotesFor({
        ...common,
        heard: "See.",
        prevMove: leadMove({ asked: ["sea"] }),
      }),
    ).toEqual([{ heard: "see", like: "sea" }]);
    // 지금 길 행(카드 첫 질문)은 move.words 를 본다
    expect(
      leadSoundNotesFor({
        ...common,
        heard: "See.",
        prevMove: talkMoveOf({ kind: "first_question", words: ["sea"] }),
      }),
    ).toEqual([{ heard: "see", like: "sea" }]);
    // 세 낱말 이상의 말 · 질문이 노린 낱말이 없는 차례는 귀띔이 없다
    expect(
      leadSoundNotesFor({
        ...common,
        heard: "I see the sea.",
        prevMove: leadMove({ asked: ["sea"] }),
      }),
    ).toEqual([]);
    expect(
      leadSoundNotesFor({ ...common, heard: "See.", prevMove: leadMove() }),
    ).toEqual([]);
  });
});

describe("대화 기록 · 인사 이음(spec 설계 2 '대화 기록')", () => {
  const raw = (say: string) =>
    JSON.stringify({ reading: "clear_answer", move: "react_only", say });
  const rows = [
    {
      speaker: "tori" as const,
      turnNo: 1,
      segment: "greeting",
      text: "Hello! How are you?",
    },
    {
      speaker: "child" as const,
      turnNo: 1,
      segment: "greeting",
      text: "I'm good.",
    },
    {
      speaker: "tori" as const,
      turnNo: 2,
      segment: "talk",
      text: "Great!\nDo you like the sea?",
    },
    { speaker: "child" as const, turnNo: 2, segment: "talk", text: null },
    {
      speaker: "child" as const,
      turnNo: 3,
      segment: "talk",
      text: "Yes.",
      sentUserMessage: "U1",
    },
    {
      speaker: "tori" as const,
      turnNo: 4,
      segment: "talk",
      text: "Nice!",
      move: leadMove(),
      toriRewrite: raw("Nice!"),
    },
    {
      speaker: "child" as const,
      turnNo: 4,
      segment: "talk",
      text: "Hmm.",
      sentUserMessage: "U2",
    },
    // 앱이 고른 한 줄로 닫힌 차례(응답 원문 없음)는 기록에 들지 않는다
    {
      speaker: "tori" as const,
      turnNo: 5,
      segment: "talk",
      text: "Good job!",
      move: talkMoveOf({ kind: "ai" }),
      toriRewrite: null,
    },
  ];

  it("AC-26b 기록은 새 엔진 행의 응답 원문과 바로 앞 아이 행의 보낸 사용자 메시지 쌍이다(입구 차례는 선생님 행에 둔 사용자 메시지)", () => {
    expect(leadHistoryOf(rows)).toEqual([
      { user: "U1", assistant: raw("Nice!") },
    ]);
    const opened = {
      speaker: "tori" as const,
      turnNo: 3,
      segment: "talk",
      text: "Hi! What do you like?",
      move: talkMoveOf({ kind: "first_question", lead: leadOf() }),
      toriRewrite: raw("Hi! What do you like?"),
      sentUserMessage: "U0",
    };
    expect(leadHistoryOf([...rows.slice(0, 2), opened])).toEqual([
      { user: "U0", assistant: raw("Hi! What do you like?") },
    ]);
  });

  it("AC-26c 첫 호출의 인사 이음은 선생님 말 · 들린 글을 차례대로 싣고 말로 답하지 않은 아이 행은 뺀다", () => {
    expect(leadGreetingOf(rows.slice(0, 4))).toEqual([
      { speaker: "teacher", text: "Hello! How are you?" },
      { speaker: "child", text: "I'm good." },
      { speaker: "teacher", text: "Great! Do you like the sea?" },
    ]);
  });
});

describe("흘려 받는 동안(spec 설계 6 · 8)", () => {
  it("AC-26i 1~3단계 model_repeat 차례만 말 칸 전체를 붙잡는다", () => {
    expect(
      leadHoldSayOf(3)({ reading: "does_not_know", move: "model_repeat" }),
    ).toBe(true);
    expect(leadHoldSayOf(3)({ move: "react_and_follow_up" })).toBe(false);
    expect(leadHoldSayOf(4)({ move: "model_repeat" })).toBe(false);
  });

  it("AC-26b 보통 차례는 반응과 질문을 바로 내보낸다(응답을 고쳐 쓰지 않음)", () => {
    const flow = createLeadSentenceFlow({
      low: true,
      closing: false,
      prevStuck: false,
      hitsOf: noHits,
    });
    flow.heads({ move: "react_and_follow_up" });
    expect(flow.accept("A park, nice!")).toBe(true);
    expect(flow.accept("Do you see grass or a river?")).toBe(true);
    expect(flow.sentCount()).toBe(2);
  });

  it("AC-26g 좁은 정의에 걸린 질문은 내보내기 전에 붙잡고, 앞서 나간 반응 문장은 그대로다", () => {
    const flow = createLeadSentenceFlow({
      low: true,
      closing: false,
      prevStuck: false,
      hitsOf,
    });
    flow.heads({ move: "react_and_follow_up" });
    expect(flow.accept("You go to the beach!")).toBe(true);
    expect(flow.accept("Do you go in summer or winter?")).toBe(false);
    expect(flow.accept("Tell me!")).toBe(false);
    expect(flow.sentCount()).toBe(1);
  });

  it("AC-26g 마무리 차례 · move wrap_up 차례의 물음은 좁은 정의로 붙잡지 않는다", () => {
    for (const [closing, move] of [
      [true, "react_only"],
      [false, "wrap_up"],
    ] as const) {
      const flow = createLeadSentenceFlow({
        low: true,
        closing,
        prevStuck: true,
        hitsOf,
      });
      flow.heads({ move });
      expect(flow.accept("Do you like summer or winter?")).toBe(true);
    }
  });

  it("AC-26i 1~3단계 막힌 뒤 차례는 물음 문장부터 붙잡고(나뉜 고르기를 함께 보려고) 앞 반응은 바로 내보낸다", () => {
    const flow = createLeadSentenceFlow({
      low: true,
      closing: false,
      prevStuck: true,
      hitsOf: noHits,
    });
    flow.heads({ move: "ask_again" });
    expect(flow.accept("No problem!")).toBe(true);
    expect(flow.accept("Beach?")).toBe(false);
    expect(flow.accept("Or mountain?")).toBe(false);
    // 4단계부터는 붙잡지 않는다(지금처럼 글로 듦)
    const high = createLeadSentenceFlow({
      low: false,
      closing: false,
      prevStuck: true,
      hitsOf: noHits,
    });
    high.heads({ move: "easier_or_choices" });
    expect(high.accept("Beach or mountain?")).toBe(true);
  });

  it("AC-26i 앞 아이 차례 막힘은 응답의 reading(첫 문장 전 앞 칸)으로 정하고, 'See.' 같은 같은 소리 장면 낱말은 무름으로 막힘이 아니다", () => {
    const common = {
      sceneWords: new Set(["sea", "see", "beach"]),
      homophones: [["see", "sea"]],
    };
    expect(
      leadChildStuckOf({
        ...common,
        reading: "does_not_know",
        mode: "speech",
        heard: "Um.",
      }),
    ).toBe(true);
    expect(
      leadChildStuckOf({
        ...common,
        reading: "likely_misheard",
        mode: "speech",
        heard: "See.",
      }),
    ).toBe(false);
    expect(
      leadChildStuckOf({
        ...common,
        reading: "does_not_know",
        mode: "dont_know",
        heard: "",
      }),
    ).toBe(false);
    expect(
      leadChildStuckOf({
        ...common,
        reading: "nope",
        mode: "speech",
        heard: "Um.",
      }),
    ).toBe(false);
    const flow = createLeadSentenceFlow({
      low: true,
      closing: false,
      prevStuck: (heads) =>
        leadChildStuckOf({
          ...common,
          reading: heads.reading,
          mode: "speech",
          heard: "Um.",
        }),
      hitsOf: noHits,
    });
    flow.heads({ reading: "does_not_know", move: "react_and_follow_up" });
    expect(flow.accept("That's okay!")).toBe(true);
    expect(flow.accept("Beach or park?")).toBe(false);
    // 응답이 끊긴 차례의 끝 처리가 쓰는 앞 칸 값
    expect(flow.move()).toBe("react_and_follow_up");
    expect(flow.prevStuck()).toBe(true);
  });

  it("AC-26g 다시 말하기 대상은 처음 걸린 물음 문장 하나이고, 마무리 차례 · wrap_up 은 없다", () => {
    const sentences = ["Wow!", "Do you go in summer or winter?"];
    expect(
      leadNarrowTargetOf(sentences, {
        closing: false,
        move: "react_and_follow_up",
        hitsOf,
      }),
    ).toEqual({
      index: 1,
      sentence: "Do you go in summer or winter?",
      hits: [{ kind: "choice", text: "summer" }],
    });
    expect(
      leadNarrowTargetOf(sentences, {
        closing: true,
        move: "react_only",
        hitsOf,
      }),
    ).toBeNull();
    expect(
      leadNarrowTargetOf(sentences, {
        closing: false,
        move: "wrap_up",
        hitsOf,
      }),
    ).toBeNull();
    expect(
      leadNarrowTargetOf(["What do you do on weekends?"], {
        closing: false,
        move: "react_and_follow_up",
        hitsOf,
      }),
    ).toBeNull();
  });
});

describe("끝에서 낼 글과 소리 줄(spec 설계 8)", () => {
  const settle = (over: Partial<Parameters<typeof leadSettleOf>[0]>) =>
    leadSettleOf({
      level: 3,
      move: "react_and_follow_up",
      prevStuck: false,
      closing: false,
      modelSentence: "",
      sentences: [],
      sentCount: 0,
      held: false,
      narrow: null,
      ...over,
    });

  it("AC-26b 문장 문 · 좁은 정의에 걸리지 않으면 나간 글 = 말 칸이고 더 낼 것이 없다", () => {
    const out = settle({
      sentences: ["A park, nice!", "Do you see grass or a river?"],
      sentCount: 2,
    });
    expect(out.say).toBe("A park, nice! Do you see grass or a river?");
    expect(out.release).toEqual([]);
    expect(out.shown).toEqual([
      "A park, nice!",
      "Do you see grass or a river?",
    ]);
    expect(out.sound).toEqual({});
    expect(out.removed).toEqual([]);
  });

  it("AC-26g 다시 받은 질문이 그 자리에 들어가고 앞 문장은 그대로다", () => {
    const out = settle({
      sentences: ["You go to the beach!", "Do you go in summer or winter?"],
      sentCount: 1,
      narrow: { index: 1, sentence: "Do you go in the hot or cold days?" },
    });
    expect(out.say).toBe(
      "You go to the beach! Do you go in the hot or cold days?",
    );
    expect(out.release).toEqual(["Do you go in the hot or cold days?"]);
    expect(out.shown[0]).toBe("You go to the beach!");
  });

  it("AC-26i 1~3단계 model_repeat 차례: 따라 할 문장은 글에서 빠져 소리 줄(model)로 가고 안내 말은 글로 남는다", () => {
    const out = settle({
      move: "model_repeat",
      modelSentence: "I see the sea.",
      sentences: ["Good try!", "Say it with me: I see the sea."],
      held: true,
    });
    expect(out.say).toBe("Good try! Say it with me: I see the sea.");
    expect(out.sound).toEqual({ model: "I see the sea." });
    expect(out.removed).toEqual(["I see the sea."]);
    expect(out.shown.join(" ")).not.toContain("I see the sea");
    expect(out.shown[0]).toBe("Good try!");
    expect(out.release).toEqual(out.shown);
  });

  it("AC-26i 1~3단계 막힌 뒤 고르기: or 물음 문장은 글에서 빠져 소리 줄(answer) 하나로 가고, 뒤에 글이 남으면 소리 차례가 바뀐 것으로 적는다", () => {
    const out = settle({
      move: "easier_or_choices",
      prevStuck: true,
      sentences: ["Okay!", "Watch TV, or go outside?", "Which one?"],
      sentCount: 1,
    });
    expect(out.sound).toEqual({ answer: "Watch TV, or go outside?" });
    expect(out.release).toEqual(["Which one?"]);
    expect(out.shown).toEqual(["Okay!", "Which one?"]);
    expect(out.soundMoved).toBe(true);
    // 나뉜 고르기는 두 문장을 한 소리 줄로
    const split = settle({
      move: "ask_again",
      prevStuck: true,
      sentences: ["No problem!", "Beach?", "Or mountain?"],
      sentCount: 1,
    });
    expect(split.sound).toEqual({ answer: "Beach? Or mountain?" });
    expect(split.release).toEqual([]);
    expect(split.soundMoved).toBe(false);
  });

  it("AC-26i 보통 차례의 이어 묻는 고르기 질문 · 4단계는 글로 남는다", () => {
    expect(
      settle({
        sentences: ["A park, nice!", "Do you see grass or a river?"],
        sentCount: 2,
      }).sound,
    ).toEqual({});
    const high = settle({
      level: 4,
      move: "model_repeat",
      modelSentence: "I see the sea.",
      sentences: ["Say it with me: I see the sea."],
      held: false,
      sentCount: 1,
    });
    expect(high.sound).toEqual({});
    expect(high.shown).toEqual(["Say it with me: I see the sea."]);
  });

  it("AC-26i move 의 소리 줄은 이 차례에 실제로 낸 소리 줄로 맞춘다: 낸 줄이 없으면 move.sound 를 빼고, 있으면 그 줄로 바꾼다(검토 rev-s1-3 O-2)", () => {
    const withOld = { ...leadMove(), sound: { model: "Old line." } };
    // 낸 소리 줄이 없으면 앞 값이 남지 않는다
    const none = leadMoveWithSound(withOld, {});
    expect("sound" in none).toBe(false);
    expect(none).toEqual(leadMove());
    // model · answer 는 낸 그대로(새 객체) 들어간다
    const model = { model: "I see the sea." };
    const withModel = leadMoveWithSound(withOld, model);
    expect(withModel.sound).toEqual({ model: "I see the sea." });
    expect(withModel.sound).not.toBe(model);
    expect(
      leadMoveWithSound(leadMove(), { answer: "Summer or winter?" }).sound,
    ).toEqual({ answer: "Summer or winter?" });
    // 다른 칸은 그대로이고 입력 move 는 바뀌지 않는다
    expect({ ...withModel, sound: undefined }).toEqual({
      ...withOld,
      sound: undefined,
    });
    expect(withOld.sound).toEqual({ model: "Old line." });
  });

  it("AC-26c 마무리 차례는 말 칸에 물음 문장이 없을 때만 상수 물음을 붙인다", () => {
    expect(
      leadClosingAddsOf({ closing: true, say: "You did great today!" }),
    ).toBe(true);
    expect(
      leadClosingAddsOf({
        closing: true,
        say: "You did great! Shall we talk a little more?",
      }),
    ).toBe(false);
    expect(leadClosingAddsOf({ closing: false, say: "Nice!" })).toBe(false);
  });

  it("AC-26j ai_question 은 질문 글 · 뜻 · 검사를 지난 힌트만 싣는다", () => {
    expect(
      leadAiQuestionOf({
        question: "What do you see?",
        ko: "뭐가 보여?",
        hintEn: "I see the sea.",
        hints: {
          hintKo: "바다가 보여.",
          hints: ["I see the ___.", "I see the sea."],
          usable: [],
        },
      }),
    ).toEqual({
      en: "What do you see?",
      ko: "뭐가 보여?",
      answerExample: "I see the sea.",
      hintKo: "바다가 보여.",
      hints: ["I see the ___.", "I see the sea."],
    });
    expect(
      leadAiQuestionOf({
        question: "What do you see?",
        ko: "",
        hintEn: "I see the sea.",
        hints: undefined,
      }),
    ).toEqual({ en: "What do you see?", ko: "", answerExample: "" });
    expect(
      leadAiQuestionOf({
        question: null,
        ko: "",
        hintEn: "",
        hints: undefined,
      }),
    ).toBeNull();
  });
});

describe("좁은 정의 다시 말하기 규격(spec 설계 6 (나), 브리프 3)", () => {
  const input = {
    level: 3,
    canDo: "",
    learningElement: "",
    prevLearningElements: [],
    unitWords: ["sea", "see"],
    sentenceMaxWords: 7,
    teacher: { nameEn: "Mina", personaEn: "Warm and patient." },
    cefr: { level: "Pre-A1", next: "A1" },
    text: TALK_LEAD_TEXT_L3U1,
    history: [{ user: "U0", assistant: "{}" }],
    turn: {
      child: { kind: "speech", heard: "Momo likes the beach." },
      status: { goalWordsSaid: [] },
    },
    retry: { assistant: '{"say":"Q?"}', prompt: "Say it again." },
  } as const satisfies Parameters<typeof talkLeadRetrySpec.messages>[0] &
    Partial<TalkLeadInput>;

  it("AC-26g 같은 안내문 · 이 차례까지의 기록 · 이 차례 응답 원문 · 요청 글 하나를 보내고, 한 칸짜리 응답을 받는다", () => {
    const rules = { teacherSentencesMax: 3 };
    const messages = talkLeadRetrySpec.messages(input, rules);
    expect(messages.map((m) => m.role)).toEqual([
      "user",
      "assistant",
      "user",
      "assistant",
      "user",
    ]);
    expect(messages.at(-2)?.content).toBe('{"say":"Q?"}');
    expect(messages.at(-1)?.content).toBe("Say it again.");
    expect(talkLeadRetrySpec.system(input, rules)).toContain(
      "Output JSON only",
    );
    expect(talkLeadRetrySpec.title).toBe(TALK_LEAD_RETRY_TITLE);
    expect(talkLeadRetrySpec.purpose).toBe("talk_turn");
    expect(
      talkLeadRetrySpec.normalize({ question: "Is it hot?" }, input, rules),
    ).toEqual({ question: "Is it hot?" });
    expect(talkLeadRetrySpec.normalize({ say: "x" }, input, rules)).toBeNull();
    // 출력 검사에 걸리면 칸을 비운다(원래 질문이 나감)
    expect(
      talkLeadRetrySpec.applyChecks(
        { question: "bad" },
        new Map([["question", [{ kind: "forbidden", match: "bad" }]]]),
        input,
      ).value,
    ).toEqual({ question: "" });
    // 가림은 이번 아이 말에 걸고 요청 몫은 그대로다
    const masked = talkLeadRetrySpec.mask(input, (t) => ({
      text: t.replace("Momo", "{NAME}"),
      names: 1,
      contacts: 0,
    }));
    expect(masked.turn.child).toEqual({
      kind: "speech",
      heard: "{NAME} likes the beach.",
    });
    expect(masked.retry).toEqual(input.retry);
  });

  it("AC-26b ai_calls 표지는 새 엔진 호출과 다시 말하기를 가른다", () => {
    expect(LEAD_RECORD_TAG).toBe("lead");
    expect(LEAD_NARROW_RECORD_TAG.startsWith(LEAD_RECORD_TAG)).toBe(true);
  });
});

describe("지금 턴 길 접점(lesson-turn.ts)", () => {
  const card = {
    todayWords: [{ word: "eat" }],
    closingLines: [{ en: "Bye for now!" }],
  };
  const rows = [
    {
      speaker: "tori" as const,
      recast: "I eat bread.",
      move: talkMoveOf({
        kind: "ai",
        lead: leadOf({ model: { sentence: "I eat apples.", inSay: true } }),
      }),
    },
  ];
  const base = {
    rows,
    card,
    spec: { koMeaning: false },
    lemmaOf: () => undefined,
    level: 3,
  } as unknown as Parameters<typeof lessonWrapLinesOf>[0];
  const claude = { leadMode: "claude" } as Parameters<
    typeof lessonWrapLinesOf
  >[0]["start"];

  it("AC-26c 쉬는 중 닫기의 되짚을 말: 새 엔진 세션은 확인된 따라 할 문장에서, 지금 방식 세션은 recast 에서 고른다(처음 스냅숏의 방식)", () => {
    expect(
      lessonWrapLinesOf({ ...base, start: claude }).map((l) => l.en),
    ).toEqual(["I eat apples."]);
    expect(lessonWrapLinesOf(base).map((l) => l.en)).toEqual(["I eat bread."]);
  });

  it("AC-26a 4단계부터 claude 스냅숏으로 연 수업은 기존 방식이라 쉬는 중 닫기도 recast 를 쓴다(isLeadSession — 검토 rev-s1 I-1)", () => {
    expect(
      lessonWrapLinesOf({ ...base, start: claude, level: 4 }).map((l) => l.en),
    ).toEqual(["I eat bread."]);
  });

  it("AC-26a 되짚을 말의 출처는 두 자리(쉬는 중 닫기 · 정리 토막)가 같은 판단으로 같은 답을 낸다", () => {
    const cases = [
      { start: null, level: 3 },
      { start: {}, level: 3 },
      { start: { leadMode: "app" as const }, level: 3 },
      { start: claude, level: 1 },
      { start: claude, level: 3 },
      { start: claude, level: 4 },
      { start: claude, level: 12 },
    ];
    for (const c of cases) {
      const state = { rows, ...c } as unknown as Parameters<
        typeof lessonWrapSourcesOf
      >[0];
      expect(leadWrapRecastsOf(state)).toEqual(lessonWrapSourcesOf(state));
    }
  });
});

describe("서버 턴 길의 배선(spec AC-12 — 서버 턴 길과 대본 도구가 같은 함수를 부름)", () => {
  const tori = (over: Record<string, unknown>) => ({
    speaker: "tori" as const,
    turnNo: 1,
    segment: "greeting",
    text: "Hi! How are you?",
    ...over,
  });
  const kid = (over: Record<string, unknown>) => ({
    speaker: "child" as const,
    turnNo: 1,
    segment: "greeting",
    text: "I'm good.",
    ...over,
  });
  const statusBase = {
    hasChild: true,
    speech: true,
    heard: "I like apples.",
    turnsLeft: 3,
    unitWords: ["apple", "banana"],
    homophones: [] as string[][],
    soundAlikes: [],
    lemmaOf: (w: string) => w.toLowerCase().replace(/s$/, ""),
    open: null,
    closing: false,
  };

  it("AC-26l 사실 알림 값: 아이 말 차례는 아이 차례 번호 · 말한 단원 단어 · 도움 수 · 앞 차례의 따라 할 문장 · 소리 귀띔을 싣고, 첫 차례가 아니면 대화 시작 줄이 없다", () => {
    const rows = [
      tori({}),
      kid({}),
      tori({
        turnNo: 2,
        segment: "talk",
        text: "Say: I like apples.",
        move: talkMoveOf({
          kind: "first_question",
          lead: leadOf({
            move: "model_repeat",
            model: { sentence: "I like apples.", inSay: true },
          }),
        }),
      }),
      kid({ turnNo: 2, segment: "talk", text: "I like apples." }),
    ];
    const status = leadStatusOf({ ...statusBase, rows });
    expect(Object.keys(status)).toEqual([
      "childTurn",
      "goalWordsSaid",
      "help",
      "lastModelSentence",
      "soundNotes",
    ]);
    expect(status.childTurn).toEqual(
      leadChildTurnOf({ rows, turnsLeft: statusBase.turnsLeft }),
    );
    expect(status.goalWordsSaid).toEqual(
      talkLeadGoalWordsSaidOf(
        ["I'm good.", "I like apples."],
        statusBase.unitWords,
      ),
    );
    expect(status.help).toEqual({
      easierQuestion: 0,
      choices: 0,
      modelSentence: 1,
    });
    expect(status.lastModelSentence).toBe("I like apples.");
    // 마무리 차례면 사실 줄이 하나 더 붙는다
    expect(
      leadStatusOf({ ...statusBase, rows, closing: true }).closingTurn,
    ).toBe(true);
    // 말 입력이 아니면 소리 귀띔이 없다
    expect(
      leadStatusOf({ ...statusBase, rows, speech: false, heard: "" }),
    ).not.toHaveProperty("soundNotes");
  });

  it("AC-26l 사실 알림 값: 입구 start 는 아이 차례 번호 · 소리 귀띔 없이 대화 시작을 싣고, 입구 more 는 대화 토막의 선생님 행이 있어 대화 시작이 없다", () => {
    const greeting = [tori({}), kid({})];
    const start = leadStatusOf({
      ...statusBase,
      rows: greeting,
      hasChild: false,
      speech: false,
      heard: "",
      open: "start",
    });
    expect(start).not.toHaveProperty("childTurn");
    expect(start).not.toHaveProperty("soundNotes");
    expect(start.talkStarts).toBe(true);
    const more = leadStatusOf({
      ...statusBase,
      rows: [
        ...greeting,
        tori({ turnNo: 2, segment: "talk", move: leadMove() }),
      ],
      hasChild: false,
      speech: false,
      heard: "",
      open: "more",
    });
    expect(more).not.toHaveProperty("talkStarts");
    // 행 차례가 섞여 들어와도 대화 차례(턴 번호 · 같은 번호면 선생님 먼저)로 다시 놓고 읽는다
    const shuffled = [kid({}), tori({})];
    expect(leadStatusOf({ ...statusBase, rows: shuffled }).childTurn).toEqual(
      leadStatusOf({ ...statusBase, rows: greeting }).childTurn,
    );
  });

  it("AC-26l 마무리 차례는 말로 답한 차례에서 참고 턴에 닿았거나 더 이야기하기 한 바퀴가 끝났을 때뿐이고, 말로 답하지 않은 차례는 위치를 읽지 않는다", () => {
    const at = (reachedNow: boolean, roundEndedNow: boolean) => () => ({
      reachedNow,
      roundEndedNow,
    });
    expect(
      leadClosingTurnOf({ speech: true, positionAfter: at(true, false) }),
    ).toBe(true);
    expect(
      leadClosingTurnOf({ speech: true, positionAfter: at(false, true) }),
    ).toBe(true);
    expect(
      leadClosingTurnOf({ speech: true, positionAfter: at(false, false) }),
    ).toBe(false);
    let read = 0;
    expect(
      leadClosingTurnOf({
        speech: false,
        positionAfter: () => {
          read += 1;
          return { reachedNow: true, roundEndedNow: true };
        },
      }),
    ).toBe(false);
    expect(read).toBe(0);
  });

  it("AC-26l gate 칸은 문장 문 걸림 → 받아 둔 차례(held_say · held_question) → 힌트 단 걸림 → 범위 못 읽음 차례로 쌓는다", () => {
    const base = {
      blocked: [] as string[],
      heldSay: false,
      flowHeld: false,
      sentCount: 1,
      hintBlock: null,
      rangeUnread: false,
    };
    expect(leadGateOf(base)).toEqual([]);
    expect(
      leadGateOf({
        ...base,
        blocked: ["forbidden"],
        heldSay: true,
        flowHeld: true,
        sentCount: 0,
        hintBlock: { kind: "level" },
        rangeUnread: true,
      }),
    ).toEqual(["forbidden", "held_say", "hint_level", "range_unread"]);
    // 첫 문장부터 물음을 붙잡았을 때만 held_question(앞 문장을 이미 보냈으면 아님)
    expect(leadGateOf({ ...base, flowHeld: true, sentCount: 0 })).toEqual([
      "held_question",
    ]);
    expect(leadGateOf({ ...base, flowHeld: true, sentCount: 1 })).toEqual([]);
  });

  it("AC-26l 되물은 뒤 하한: 앞 선생님 행이 새 엔진의 되묻기이고 되물은 아이 차례가 있을 때만 그 힌트 칸을 하한으로 이어 받고, 값이 바뀔 때만 고쳐 쓸 칸이 있다", () => {
    const own = leadChildHelpOfRow({});
    expect(own).toEqual({ hintKind: "none", hintLevel: 0, heardHelp: null });
    const asked = leadChildHelpOfRow({
      hintKind: "meaning_only",
      hintLevel: 1,
      heardHelp: null,
    });
    const askAgain = leadMove({ move: "ask_again" });
    expect(leadAskAgainFloorApplies({ own, prevMove: askAgain, asked })).toBe(
      true,
    );
    expect(leadAskAgainFloorApplies({ own, prevMove: leadMove(), asked })).toBe(
      false,
    );
    expect(
      leadAskAgainFloorApplies({ own, prevMove: askAgain, asked: null }),
    ).toBe(false);
    expect(
      leadAskAgainFloorApplies({ own: null, prevMove: askAgain, asked }),
    ).toBe(false);
    const after = leadChildHelpAfterOf({ own, prevMove: askAgain, asked });
    expect(after.help).toEqual(leadAskAgainFloorOf(own, asked));
    expect(after.fields).toEqual(after.help);
    // 하한이 적용되지 않으면 제 값 그대로이고 고쳐 쓸 칸이 없다
    expect(leadChildHelpAfterOf({ own, prevMove: leadMove(), asked })).toEqual({
      help: own,
      fields: {},
    });
    expect(
      leadChildHelpAfterOf({ own: null, prevMove: askAgain, asked }),
    ).toEqual({ help: null, fields: {} });
    // 하한을 적용했지만 제 값이 이미 같거나 커서 값이 그대로면 고쳐 쓸 칸이 비어 있다(검토 rev-s1-2 N-4)
    const higher = leadChildHelpOfRow({
      hintKind: "english",
      hintLevel: 2,
      heardHelp: "answer_example",
    });
    expect(
      leadAskAgainFloorApplies({ own: higher, prevMove: askAgain, asked }),
    ).toBe(true);
    expect(
      leadChildHelpAfterOf({ own: higher, prevMove: askAgain, asked }),
    ).toEqual({ help: higher, fields: {} });
  });
});

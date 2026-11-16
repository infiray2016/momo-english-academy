// 회화 이야기 방식의 마무리 차례(13절 C243 보완 9 — spec '회화 대화 구조 R' 판 6 설계 3 · 9): (1) 마무리 사실 줄은 아직 작별하지 말고 더 이야기할지
// 제 말로 묻게 하는 사실을 담고, (2) 앱의 마무리 차례에 선생님 말 칸에 물음 문장이 없으면 앱이 'Do you want to talk more?' 를 붙인다(지금 새 방식의
// leadClosingAddsOf 와 같은 규칙 — 서버 턴 길과 대본 도구가 함께 부르는 core chatTurnResultOf 안에서). 마무리가 아닌 차례 · 선생님이 wrap_up 으로
// 맺은 차례 · 안전 상한 차례는 그대로다.
import { describe, expect, it } from "vitest";
import {
  CHAT_QUESTION_MAX,
  CHAT_SENTENCE_MAX,
} from "@/core/ai/calls/talk-chat";
import {
  type ChatInput,
  chatFactLineOf,
  chatUserMessageOf,
} from "@/core/conversation/chat-message";
import type { ChatReplyCheck } from "@/core/conversation/chat-reply";
import {
  type ChatTurnPlan,
  chatReplayLinesOf,
  chatTurnPlanOf,
} from "@/core/conversation/chat-turn-plan";
import {
  type ChatCallResult,
  chatClosingAddsOf,
  chatTurnResultOf,
} from "@/core/conversation/chat-turn-result";
import { leadClosingAddsOf } from "@/core/conversation/lead-turn-core";
import { talkLessonPositionOf } from "@/core/conversation/lesson-flow";
import type { LowLevelLineOptions } from "@/core/conversation/question-check";
import { MORE_PROMPT } from "@/core/conversation/spoken";
import { CARD3, LOW, NEW3, SPEC3, teacher } from "../fixtures/talk-lesson";

/** 판 5 의 마무리 사실 줄(13절 C243 보완 8 (4)). */
const CLOSING_V5 =
  "This is the closing turn. After your turn the app shows the buttons 'talk more' and 'finish'. If the child chooses 'talk more', the chat goes on from here. If the child finishes, the app does a short review and says goodbye.";
/** 판 6 의 마무리 사실 줄(13절 C243 보완 9 (1)). */
const CLOSING_V6 =
  "This is the closing turn. After your turn the app shows the buttons 'talk more' and 'finish'. If the child chooses 'talk more', the chat goes on from here. If the child finishes, the app does a short review and says goodbye, so do not say goodbye yet. In your own words, ask the child if they want to talk more.";

const range: LowLevelLineOptions = {
  sentenceMaxWords: 8,
  allowedWords: new Set(
    "i you we it a the like cats cat dogs do or nice bye fun was great talk today more want to".split(
      " ",
    ),
  ),
  unitWords: ["play"],
  childWords: [],
  teacherName: "Mina",
  lemmaOf: (s) => s.toLowerCase(),
  forms: [],
  allowedForms: new Set(),
};
const CHECK: ChatReplyCheck = {
  range,
  sentenceMax: CHAT_SENTENCE_MAX,
  questionMax: CHAT_QUESTION_MAX,
  madeUpPhrases: [],
};
const CARD = {
  safeLines: [
    { en: "Let's keep talking.", ko: "계속 이야기하자." },
    { en: "Tell me more!", ko: "더 말해 줘!" },
  ],
  safetyFarewell: { en: "See you next time!", ko: "다음에 또 만나!" },
  greeting: CARD3.greeting,
};
const SAY: ChatInput = { kind: "speech", heard: "Yes." };

/** 대화 토막 한가운데의 부르기 전 판단(talk-chat-turn-result 시험과 같은 자리). */
function basePlan(input: ChatInput): ChatTurnPlan {
  const turns = [teacher("Do you like cats?", { kind: "ai" })];
  const args = {
    spec: SPEC3,
    card: CARD3,
    newWords: NEW3,
    turns,
    segment: "talk" as const,
    settings: LOW,
    prepWords: [...(CARD3.prep ?? [])],
  };
  return chatTurnPlanOf({
    input,
    child: { inputMode: "speech", clientListen: null },
    args,
    position: talkLessonPositionOf(args),
    rows: [{ speaker: "tori", inputMode: null }],
    segment: "talk",
    prepOpens: true,
    safetyMaxTurns: 80,
    settings: LOW,
  });
}

/** 앱의 마무리 차례(사실 줄 closing 을 붙인 차례)로 둔 판단. lastTurn 이면 안전 상한 차례까지 겹친다. */
function closingPlan({ lastTurn = false } = {}): ChatTurnPlan {
  return {
    ...basePlan(SAY),
    closing: true,
    lastTurn,
    facts: lastTurn
      ? [{ kind: "closing" }, { kind: "last_turn" }]
      : [{ kind: "closing" }],
  };
}

const ok = (
  say: string,
  { wrapUp = false, sayKo = "뜻" }: { wrapUp?: boolean; sayKo?: string } = {},
): ChatCallResult => ({
  kind: "ok",
  value: { listen_sentence: "", say, say_ko: sayKo, wrap_up: wrapUp },
  assistant: JSON.stringify({ say }),
  blocked: [],
  listenBlocked: false,
  overLength: 0,
  sentSentences: [say],
  firstSentenceMs: 1200,
});

function resultOf(
  plan: ChatTurnPlan,
  call: ChatCallResult,
  flow: { sent: string[]; held: string[] },
  { koMeaning = true } = {},
) {
  return chatTurnResultOf({
    plan,
    call,
    flow,
    level: 3,
    koMeaning,
    check: CHECK,
    card: CARD,
    safeLine: "Tell me more!",
    turnNo: 4,
    sentenceMax: 3,
    prevStage: 0,
    rowsAfter: [],
    settings: { lesson: LOW, chat: LOW.chat },
    lexicon: { unitWords: ["cats"], lemmaOf: (s) => s.toLowerCase() },
  });
}

const ASK_LINE = {
  t: "add",
  kind: "more_prompt",
  en: MORE_PROMPT.en,
  ko: MORE_PROMPT.ko,
} as const;

describe("마무리 사실 줄(13절 C243 보완 9 (1))", () => {
  it("AC-27j 마무리 사실 줄은 판 5 의 줄에 '아직 작별하지 않음 · 제 말로 더 이야기할지 물음'을 더한 글이다(앞 두 문장 · 이어짐 문장은 그대로)", () => {
    expect(chatFactLineOf({ kind: "closing" })).toBe(CLOSING_V6);
    // 판 5 의 넷째 문장 끝 마침표 자리에 ', so do not say goodbye yet.' 과 물음 문장 하나만 더했다
    expect(
      chatFactLineOf({ kind: "closing" })
        .replace(", so do not say goodbye yet.", ".")
        .replace(
          " In your own words, ask the child if they want to talk more.",
          "",
        ),
    ).toBe(CLOSING_V5);
    // 이어짐 문장(C243 보완 8 (4))은 지킨다
    expect(chatFactLineOf({ kind: "closing" })).toContain(
      "If the child chooses 'talk more', the chat goes on from here.",
    );
    // 마무리 차례의 사용자 메시지에만 든다(안전 상한 차례는 마무리 줄을 내지 않음)
    expect(
      chatUserMessageOf({ facts: [{ kind: "closing" }], input: SAY }),
    ).toContain(CLOSING_V6);
    expect(
      chatUserMessageOf({
        facts: [{ kind: "closing" }, { kind: "last_turn" }],
        input: SAY,
      }),
    ).not.toContain("do not say goodbye yet");
  });
});

describe("마무리 상수 물음(13절 C243 보완 9 (2))", () => {
  it("AC-27j 판단은 지금 새 방식의 leadClosingAddsOf 와 같은 규칙이다(물음 문장이 없을 때만) — 모델이 상수 물음과 같은 물음을 이미 했으면 두 번 붙이지 않는다", () => {
    const says = [
      "Great talk today!",
      "Great talk! See you next time!",
      "You did great! Shall we talk a little more?",
      "Wow. What do you like?",
      "",
    ];
    for (const say of says) {
      expect(chatClosingAddsOf({ closing: true, say })).toBe(
        leadClosingAddsOf({ closing: true, say }),
      );
      expect(chatClosingAddsOf({ closing: false, say })).toBe(false);
    }
    expect(
      chatClosingAddsOf({
        closing: true,
        say: "Great talk! Do you want to talk more?",
      }),
    ).toBe(false);
  });

  it("AC-27j 물음 없는 앱의 마무리 차례: 줄 끝(뜻 뒤)에 add more_prompt(뜻 함께)가 붙고 선생님 행 글은 지금 새 방식과 같은 꼴(말 칸 \\n 상수 물음), 기록 칸(move)은 모델 말 그대로다", () => {
    const r = resultOf(closingPlan(), ok("Great talk today! You did well."), {
      sent: ["Great talk today!", "You did well."],
      held: [],
    });
    expect(r.lines).toEqual([{ t: "ko", ko: "뜻" }, ASK_LINE]);
    expect(r.teacher?.text).toBe(
      `Great talk today! You did well.\n${MORE_PROMPT.en}`,
    );
    expect(r.teacher?.move.kind).toBe("closing_slot");
    expect(r.teacher?.move.app).toEqual([]);
    expect(r.finish.end).toBe("closing");
    // 붙인 물음은 만남 셈 · 갈림 표지에 들지 않는다(모델 말만)
    expect(r.diverged).toBe(false);
    // 뜻을 보이지 않는 단계는 물음 줄에도 뜻이 없다
    const plain = resultOf(
      closingPlan(),
      ok("Great talk today!"),
      { sent: ["Great talk today!"], held: [] },
      { koMeaning: false },
    );
    expect(plain.lines).toEqual([
      { t: "add", kind: "more_prompt", en: MORE_PROMPT.en },
    ]);
  });

  it("AC-27j 물음이 있는 마무리 차례에는 붙지 않는다", () => {
    for (const say of [
      "Great talk! Do you want to talk more?",
      "That was fun! Shall we keep talking?",
    ]) {
      const r = resultOf(closingPlan(), ok(say), {
        sent: [say],
        held: [],
      });
      expect(r.lines.some((l) => l.t === "add")).toBe(false);
      expect(r.teacher?.text).toBe(say);
    }
  });

  it("AC-27j 마무리가 아닌 차례 · 선생님이 wrap_up 으로 맺은 차례에는 붙지 않는다", () => {
    const plan = basePlan(SAY);
    expect(plan.closing).toBe(false);
    for (const call of [
      ok("Nice! I like cats."),
      ok("That was fun. Bye!", { wrapUp: true }),
    ]) {
      const say = call.kind === "ok" ? call.value.say : "";
      const r = resultOf(plan, call, { sent: [say], held: [] });
      expect(r.lines.some((l) => l.t === "add")).toBe(false);
      expect(r.teacher?.text).toBe(say);
    }
  });

  it("AC-27k 안전 상한 차례는 마무리 차례와 겹쳐도 붙지 않는다(닫는 줄 하나 — 지금 그대로)", () => {
    const r = resultOf(closingPlan({ lastTurn: true }), ok("Great talk!"), {
      sent: [],
      held: ["Great talk!"],
    });
    expect(r.lines).toEqual([]);
    expect(r.teacher?.text).toBe("Great talk!");
    expect(r.farewell.en).toBe("Great talk!");
  });

  it("AC-27j 응답이 없던 마무리 차례(첫 문장 뒤 끊김 · 실패 · 'AI 쉬는 중')도 지금 새 방식처럼 물음이 없으면 붙인다", () => {
    const cut = resultOf(
      closingPlan(),
      {
        kind: "cut",
        sentSentences: ["Great talk!"],
        overLength: 0,
        firstSentenceMs: 800,
      },
      { sent: ["Great talk!"], held: [] },
    );
    expect(cut.lines).toEqual([ASK_LINE]);
    expect(cut.teacher?.text).toBe(`Great talk!\n${MORE_PROMPT.en}`);
    for (const reason of ["server", "safety_cap"]) {
      const failed = resultOf(
        closingPlan(),
        { kind: "failed", reason },
        { sent: [], held: [] },
      );
      expect(failed.lines.at(-1)).toEqual(ASK_LINE);
      expect(failed.teacher?.text.endsWith(`\n${MORE_PROMPT.en}`)).toBe(true);
    }
  });

  it("AC-27j 같은 시도 다시 흘림(chatReplayLinesOf)은 붙인 물음을 실시간 길과 같은 차례 · 같은 꼴(add more_prompt)로 낸다", () => {
    const r = resultOf(closingPlan(), ok("Great talk today! You did well."), {
      sent: ["Great talk today!"],
      held: ["You did well."],
    });
    const live = [{ t: "s", en: "Great talk today!" }, ...r.lines];
    expect(live.at(-1)).toEqual(ASK_LINE);
    for (const koMeaning of [true, false]) {
      const replay = chatReplayLinesOf(
        {
          text: r.teacher?.text ?? "",
          toriKo: r.teacher?.toriKo ?? null,
          move: r.teacher?.move,
        },
        koMeaning,
      );
      expect(replay).toEqual(
        koMeaning
          ? live
          : [
              { t: "s", en: "Great talk today!" },
              { t: "s", en: "You did well." },
              { t: "add", kind: "more_prompt", en: MORE_PROMPT.en },
            ],
      );
    }
    // 붙인 물음이 없는 행(지난 행 포함)은 지금 그대로다
    expect(
      chatReplayLinesOf({ text: "Nice! Bye.", toriKo: null, move: null }, true),
    ).toEqual([
      { t: "s", en: "Nice!" },
      { t: "s", en: "Bye." },
    ]);
  });
});

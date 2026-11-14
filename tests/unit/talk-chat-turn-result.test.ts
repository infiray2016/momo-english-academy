// 회화 이야기 방식 응답 갈래의 조립(plan 묶음 S1 fix 1 — 검토 rev-chat-s1 I-2 · M-1 · M-2 · M-6): 호출 결과(응답 · 첫 문장 뒤 끊김 · 실패)와 흘림의 잡아
// 둔 문장으로 줄 · 선생님 행 초안 · 끝인사 · 만남 낱말 · 받침 단계 · 끝 줄 신호를 내는 core 함수 하나(서버 턴 길과 대본 도구가 함께 부름, NFR-4 · AC-18).
import { describe, expect, it } from "vitest";
import {
  CHAT_QUESTION_MAX,
  CHAT_SENTENCE_MAX,
} from "@/core/ai/calls/talk-chat";
import type { ChatInput } from "@/core/conversation/chat-message";
import type { ChatReplyCheck } from "@/core/conversation/chat-reply";
import {
  chatTurnPlanOf,
  createChatSentenceFlow,
} from "@/core/conversation/chat-turn-plan";
import {
  CHAT_LISTEN_BLOCKED_GATE_NAME,
  type ChatCallResult,
  chatTurnResultOf,
} from "@/core/conversation/chat-turn-result";
import { talkLessonPositionOf } from "@/core/conversation/lesson-flow";
import type { LowLevelLineOptions } from "@/core/conversation/question-check";
import { splitSentences } from "@/core/seed/text";
import { CHAT_LISTEN_BLOCKED_GATE } from "@/server/ai/talk";
import { chatSayFromRowOf } from "@/server/conversation/chat-hint";
import { CARD3, LOW, NEW3, SPEC3, teacher } from "../fixtures/talk-lesson";

const range: LowLevelLineOptions = {
  sentenceMaxWords: 8,
  allowedWords: new Set(
    "i you we it a the like cats cat dogs do or nice bye fun was hello how are".split(
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

/** 대화 토막 한가운데의 위치(질문 자리가 있는 선생님 행 뒤)에서 그 입력의 부르기 전 판단. */
function planOf(input: ChatInput, { lastTurn = false } = {}) {
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
  const child =
    input.kind === "speech"
      ? { inputMode: "speech", clientListen: null }
      : input.kind === "dont_know"
        ? { inputMode: "dont_know", clientListen: null }
        : null;
  return chatTurnPlanOf({
    input,
    child,
    args,
    position: talkLessonPositionOf(args),
    rows: [{ speaker: "tori", inputMode: null }],
    segment: "talk",
    prepOpens: true,
    safetyMaxTurns: lastTurn ? 1 : 80,
    settings: LOW,
  });
}

const ok = (
  say: string,
  {
    listen = "",
    sentSentences = [say],
    wrapUp = false,
  }: { listen?: string; sentSentences?: string[]; wrapUp?: boolean } = {},
): ChatCallResult => ({
  kind: "ok",
  value: { listen_sentence: listen, say, say_ko: "뜻", wrap_up: wrapUp },
  assistant: JSON.stringify({ say }),
  blocked: [],
  listenBlocked: false,
  overLength: 0,
  sentSentences,
  firstSentenceMs: 1200,
});

function resultOf(
  input: ChatInput,
  call: ChatCallResult,
  flow: { sent: string[]; held: string[] },
  { lastTurn = false } = {},
) {
  return chatTurnResultOf({
    plan: planOf(input, { lastTurn }),
    call,
    flow,
    level: 3,
    koMeaning: true,
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

const SAY: ChatInput = { kind: "speech", heard: "Yes." };
const DK: ChatInput = { kind: "dont_know" };

describe("보통 차례", () => {
  it("AC-27d 남은 문장 · 뜻 · 소리 줄 차례로 줄을 내고, 선생님 행 글은 흘린 줄을 이은 글이며 만남은 나간 say 전체에서 센다", () => {
    const r = resultOf(
      SAY,
      ok("Nice! I like cats. What about you?", { listen: "I like cats." }),
      { sent: ["Nice!"], held: ["I like cats.", "What about you?"] },
    );
    expect(r.lines).toEqual([
      { t: "s", en: "What about you?" },
      { t: "ko", ko: "뜻" },
      { t: "sound", kind: "model", say: "I like cats." },
    ]);
    expect(r.teacher?.text).toBe("Nice! What about you?");
    expect(r.teacher?.move.chat?.removed).toEqual(["I like cats."]);
    expect(r.met).toEqual(["cats"]);
    expect(r.diverged).toBe(false);
    expect(r.farewell).toEqual({ en: "Nice! What about you?", ko: "뜻" });
  });

  it("AC-27d 막힌 뒤 or 물음은 잡아 둔 문장에서 빠지고 소리 줄 answer 로 나간다", () => {
    const r = resultOf(DK, ok("That's okay. Do you like cats or dogs?"), {
      sent: ["That's okay."],
      held: ["Do you like cats or dogs?"],
    });
    expect(r.lines.filter((l) => l.t === "s")).toEqual([]);
    expect(r.lines).toContainEqual({
      t: "sound",
      kind: "answer",
      say: "Do you like cats or dogs?",
    });
    expect(r.teacher?.move.ai).toBe("choices");
  });
});

describe("갈린 길(검토 M-2)", () => {
  it("AC-27d 끝 부호 없는 줄바꿈이 든 say 는 화면 글 · 저장 글이 겹치지 않는다", () => {
    const r = resultOf(SAY, ok("Hello How are you?"), {
      sent: ["Hello", "How are you?"],
      held: [],
    });
    expect(r.lines.filter((l) => l.t === "s")).toEqual([]);
    expect(r.teacher?.text).toBe("Hello How are you?");
  });

  it("AC-27d say 가 listen_sentence 보다 먼저 온 응답(따라 할 문장이 이미 글로 나감)은 move 에서 그 조각을 빼고 소리 줄을 내지 않으며 갈린 길로 적는다", () => {
    const r = resultOf(
      SAY,
      ok("Nice! I like cats.", { listen: "I like cats." }),
      { sent: ["Nice!", "I like cats."], held: [] },
    );
    expect(r.lines.some((l) => l.t === "sound")).toBe(false);
    expect(r.teacher?.text).toBe("Nice! I like cats.");
    expect(r.teacher?.move.chat?.removed).toBeUndefined();
    expect(r.teacher?.move.sound).toBeUndefined();
    expect(r.diverged).toBe(true);
    // 다시 세운 글에 문장이 두 번 들지 않는다
    expect(
      chatSayFromRowOf({ text: r.teacher?.text ?? "", move: r.teacher?.move }),
    ).toBe("Nice! I like cats.");
  });
});

describe("안전 상한 차례(검토 I-2 · M-1)", () => {
  it("AC-27k 안전 상한 차례 move 에는 뺀 문장 · 소리 차례 바뀜 · 고르기 표시가 없고, 다시 세운 글이 say 와 같다(따라 할 문장 대조는 남음)", () => {
    for (const [input, say, listen] of [
      [SAY, "Nice! I like cats. Bye!", "I like cats."],
      [DK, "It was fun. Do you like cats or dogs?", ""],
    ] as const) {
      const r = resultOf(
        input,
        ok(say, { listen }),
        { sent: [], held: [] },
        {
          lastTurn: true,
        },
      );
      const chat = r.teacher?.move.chat;
      expect(chat?.removed).toBeUndefined();
      expect(chat?.soundMoved).toBeUndefined();
      expect(chat?.choices).toBeUndefined();
      expect(r.teacher?.move.ai).toBe("none");
      expect(r.teacher?.move.sound).toBeUndefined();
      expect(r.lines).toEqual([]);
      expect(r.farewell.en).toBe(say);
      expect(
        chatSayFromRowOf({
          text: r.teacher?.text ?? "",
          move: r.teacher?.move,
        }),
      ).toBe(say);
      if (listen !== "") expect(chat?.listen?.inSay).toBe(true);
    }
  });

  it("AC-27k 안전 상한 차례가 첫 문장 뒤 끊기면 카드 안전 끝인사로 닫고 선생님 행을 남기지 않는다(응답 없는 차례와 같음)", () => {
    for (const call of [
      {
        kind: "cut",
        sentSentences: ["Wow!"],
        overLength: 0,
        firstSentenceMs: 900,
      },
      { kind: "failed", reason: "timeout" },
    ] as ChatCallResult[]) {
      const r = resultOf(
        SAY,
        call,
        { sent: [], held: ["Wow!"] },
        {
          lastTurn: true,
        },
      );
      expect(r.teacher).toBeNull();
      expect(r.lines).toEqual([]);
      expect(r.farewell).toEqual(CARD.safetyFarewell);
      expect(r.met).toEqual([]);
    }
  });
});

describe("끊김 · 응답 없는 차례", () => {
  it("AC-27d 첫 문장 뒤 끊김은 잡아 둔 문장을 글로 내고 문장 문을 지난 문장으로 닫는다", () => {
    const r = resultOf(
      SAY,
      {
        kind: "cut",
        sentSentences: ["Nice!", "I like cats."],
        overLength: 0,
        firstSentenceMs: 800,
      },
      { sent: ["Nice!"], held: ["I like cats."] },
    );
    expect(r.lines).toEqual([{ t: "s", en: "I like cats." }]);
    expect(r.teacher?.text).toBe("Nice! I like cats.");
    expect(r.teacher?.toriRewrite).toBeNull();
  });

  it("AC-27c 수업 첫 말이 실패하면 카드 인사 첫 줄, 'AI 쉬는 중'이면 끝 줄에 기다림 · 설명 기다림이 없다", () => {
    const start: ChatInput = {
      kind: "start",
      clock: { weekday: "Friday", dayPart: "evening" },
      met: 0,
    };
    const failed = resultOf(
      start,
      { kind: "failed", reason: "server" },
      { sent: [], held: [] },
    );
    expect(failed.teacher?.text).toBe("How are you today?");
    expect(failed.lines).toEqual([
      { t: "s", en: "How are you today?" },
      { t: "ko", ko: "오늘 기분 어때?" },
    ]);
    expect(failed.finish.signal.quietSeconds).toBe(LOW.chat.quietSeconds);
    const resting = resultOf(
      start,
      { kind: "failed", reason: "safety_cap" },
      { sent: [], held: [] },
    );
    expect(resting.teacher?.text).toBe("How are you today?");
    expect(resting.finish.signal.quietSeconds).toBeUndefined();
    expect(resting.finish.signal.explainWait).toBeUndefined();
  });

  it("AC-27d 거절은 그 차례의 안전한 대사(뜻 함께), 그 밖의 실패는 턴 번호로 돌린 안전한 대사(지금 실패 규칙)", () => {
    const refusal = resultOf(
      SAY,
      { kind: "failed", reason: "refusal" },
      { sent: [], held: [] },
    );
    expect(refusal.teacher?.text).toBe("Tell me more!");
    const other = resultOf(
      SAY,
      { kind: "failed", reason: "timeout" },
      { sent: [], held: [] },
    );
    expect(other.teacher?.text).toBe("Let's keep talking.");
    expect(other.lines).toContainEqual({ t: "ko", ko: "계속 이야기하자." });
  });
});

describe("기록 이름", () => {
  it("AC-27b 6.4 가 따라 할 문장을 비운 차례의 걸림 이름은 서버 호출 묶음의 이름과 같고, 그 차례 move 의 gate 에 적힌다", () => {
    expect(CHAT_LISTEN_BLOCKED_GATE_NAME).toBe(CHAT_LISTEN_BLOCKED_GATE);
    const call = ok("Nice!");
    if (call.kind !== "ok") throw new Error("ok 가 아니다");
    const r = resultOf(
      SAY,
      { ...call, listenBlocked: true, blocked: ["meta"] },
      {
        sent: ["Nice!"],
        held: [],
      },
    );
    expect(r.teacher?.move.chat?.gate).toEqual(["meta", "listen_check"]);
  });
});

// ── 고침 2(재검토 rev-chat-s1-2 N-1 · N-2) ─────────────────────────────────

describe("두 문장에 걸친 조각 · 문장 부호만 다른 차이", () => {
  /** 흘림을 서버와 같은 차례로(문장마다 accept) 돌린 뒤 조립한다. */
  function streamed(
    input: ChatInput,
    say: string,
    listen = "",
  ): ReturnType<typeof resultOf> {
    const flow = createChatSentenceFlow({
      level: 3,
      appStuck: input.kind === "dont_know",
      holdAll: false,
    });
    flow.listen(listen);
    for (const sentence of splitSentences(say)) flow.accept(sentence);
    return resultOf(
      input,
      ok(say, { listen, sentSentences: splitSentences(say) }),
      {
        sent: flow.sent(),
        held: flow.held(),
      },
    );
  }

  it("AC-27d 막힘 뒤 두 문장으로 나뉜 고르기 물음은 글 줄에 없고 소리 줄 하나로 나가며, 저장 글 = 본체 글 · 갈린 길 아님 · 다시 세운 글 = say", () => {
    const say = "That's okay. Do you like cats? Or dogs?";
    const r = streamed(DK, say);
    expect(r.lines.filter((l) => l.t === "s")).toEqual([]);
    expect(r.lines.filter((l) => l.t === "sound")).toEqual([
      { t: "sound", kind: "answer", say: "Do you like cats? Or dogs?" },
    ]);
    expect(r.teacher?.text).toBe("That's okay.");
    expect(r.diverged).toBe(false);
    expect(
      chatSayFromRowOf({ text: r.teacher?.text ?? "", move: r.teacher?.move }),
    ).toBe(say);
  });

  it("AC-27d 따라 할 문장과 두 문장 고르기 물음이 같이 든 차례도 글에 겹쳐 남지 않는다", () => {
    const say = "Okay. I like cats. Do you like cats? Or dogs?";
    const r = streamed(DK, say, "I like cats.");
    expect(r.lines.filter((l) => l.t === "s")).toEqual([]);
    expect(r.teacher?.text).toBe("Okay.");
    expect(r.diverged).toBe(false);
    const rebuilt = chatSayFromRowOf({
      text: r.teacher?.text ?? "",
      move: r.teacher?.move,
    });
    for (const part of ["I like cats.", "Do you like cats? Or dogs?"])
      expect(rebuilt.split(part).length - 1).toBe(1);
  });

  it("AC-27d '안내 말, 따라 할 문장' 꼴은 본체 글과 같은 말풍선(끝 쉼표는 쌍점)이고 갈린 길로 세지 않는다", () => {
    const r = streamed(SAY, "Can you say, I like cats?", "I like cats.");
    expect(r.teacher?.text).toBe("Can you say:");
    expect(r.diverged).toBe(false);
  });

  it("AC-27d 문장 부호만 다른 차이는 갈린 길로 세지 않는다(낱말이 다르면 센다)", () => {
    const same = resultOf(SAY, ok("Wow, nice!"), {
      sent: ["Wow nice!"],
      held: [],
    });
    expect(same.diverged).toBe(false);
    const other = resultOf(SAY, ok("Wow, nice!"), {
      sent: ["Wow, great!"],
      held: [],
    });
    expect(other.diverged).toBe(true);
  });
});

// 새 회화 엔진(N, Claude 가 이끄는 대화)의 평가 입력 기록(spec '회화 Claude 주도' 설계 4 · 데이터 절 · plan 묶음 R2).
// 지금 판정 함수(heardHelpsOfMove · hintKindOf · saidWordsOf · effectiveStuckOf)는 그대로 부르고, 이 시험은 N 의 응답 글에서 그 입력을
// 같은 뜻으로 채우는지 본다. 동음이의어는 시드 목록 그대로다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  heardHelpOf,
  heardHelpsOfMove,
  hintKindOf,
} from "@/core/conversation/hints";
import {
  hasLeadChoiceQuestion,
  isLeadAskAgain,
  type LeadChildHelp,
  type LeadResponse,
  leadAskAgainFloorOf,
  leadChildKindOf,
  leadChoicesOf,
  leadModelOf,
  leadPrevStuckOf,
  leadSaidWordsOf,
  leadStuckOf,
  leadTeacherMoveOf,
  leadWrapSourcesOf,
} from "@/core/conversation/lead-record";
import {
  type LessonArgs,
  talkLessonPositionOf,
} from "@/core/conversation/lesson-flow";
import type {
  TalkLessonChildTurn,
  TalkLessonTurn,
} from "@/core/conversation/lesson-turns";
import {
  eraseTalkMoveText,
  readTalkMove,
  TALK_LEAD_MOVES,
  TALK_LEAD_READINGS,
  TALK_SUPPORT_STAGE_EASY,
  TALK_SUPPORT_STAGE_TOGETHER,
  type TalkMove,
  TalkMoveSchema,
  talkMoveOf,
} from "@/core/conversation/move";
import { HomophonesFileSchema } from "@/core/seed/schema/reference";
import { lemmaLookup } from "@/core/session/attempt";
import {
  CARD3,
  LOW as FX_LOW,
  button as fxButton,
  said as fxSaid,
  NEW3,
  opening3,
  SPEC3,
} from "../fixtures/talk-lesson";

const HOMOPHONES = HomophonesFileSchema.parse(
  JSON.parse(
    readFileSync(join(process.cwd(), "seed/lists/homophones.json"), "utf8"),
  ),
).groups;
// 3단계 단원 1 의 단원 단어 일부(spec 설계 2 의 Goal words)
const VOCAB = [
  { word: "eat", forms: ["eats", "ate", "eaten", "eating"] },
  { word: "go", forms: ["goes", "went", "gone", "going"] },
  { word: "see", forms: ["sees", "saw", "seen", "seeing"] },
  { word: "sea", forms: ["seas"] },
  { word: "beach", forms: ["beaches"] },
  { word: "mountain", forms: ["mountains"] },
  { word: "watch", forms: ["watches", "watched", "watching"] },
];
const UNIT_WORDS = VOCAB.map((v) => v.word);
const lemmaOf = lemmaLookup(VOCAB);
const lex = { unitWords: UNIT_WORDS, lemmaOf };
const LOW = { band: "1-3" as const };
const MID = { band: "4-6" as const };

/** lead 칸이 없는 옛 move(지금 길 · 옛 행). */
const old = talkMoveOf({
  kind: "ai",
  next: "follow_up",
  stage: TALK_SUPPORT_STAGE_TOGETHER,
  cause: "button",
  app: ["together"],
  ai: "together",
  sound: { model: "I go to the park." },
});

const response = (over: Partial<LeadResponse>): LeadResponse => ({
  reading: "clear_answer",
  move: "react_and_follow_up",
  say: "",
  model_sentence: "",
  ...over,
});

type PrevChild = Pick<TalkLessonChildTurn, "input" | "stuck" | "nospeech">;
const spoke: PrevChild = { input: "speech", stuck: false, nospeech: false };
const stuckSpeech: PrevChild = {
  input: "speech",
  stuck: true,
  nospeech: false,
};
const button: PrevChild = { input: "dont_know", stuck: false, nospeech: false };
const silent: PrevChild = { input: "dont_know", stuck: false, nospeech: true };

const teacher = (
  r: Partial<LeadResponse>,
  opts: {
    prevChild?: PrevChild | null;
    spec?: { band: "1-3" | "4-6" };
    closingSlot?: boolean;
    firstQuestion?: boolean;
  } = {},
): TalkMove =>
  leadTeacherMoveOf({
    response: response(r),
    prevChild: opts.prevChild === undefined ? spoke : opts.prevChild,
    spec: opts.spec ?? LOW,
    closingSlot: opts.closingSlot ?? false,
    firstQuestion: opts.firstQuestion ?? false,
    ...lex,
  });

/** 다음 아이 차례 행의 힌트 칸(지금 함수 그대로: 앞 선생님 행 move 로 본 들은 도움 + 연 힌트 단 없음). */
const childHelpAfter = (
  move: TalkMove | null,
  spec: { band: "1-3" | "4-6" } = LOW,
): LeadChildHelp => {
  const heard = heardHelpsOfMove(move, spec);
  const help = heardHelpOf(heard);
  return {
    hintKind: hintKindOf({ opened: [], heard }),
    hintLevel: 0,
    heardHelp: help === "none" ? null : help,
  };
};

const said = (
  candidates: string[],
  heard: string,
  help: LeadChildHelp,
  stuck = false,
  askAgain = false,
) =>
  leadSaidWordsOf({
    candidates,
    heard,
    hintKind: help.hintKind,
    speech: true,
    stuck,
    askAgain,
    homophones: HOMOPHONES,
    ...lex,
  });

describe("따라 할 문장 대조(설계 4 첫 줄, AC-4)", () => {
  it("AC-26d say 에 든 model_sentence 는 맞음으로 적고, 다음 아이 차례는 answer_example · '영어' · said_words 빔이다", () => {
    const model = leadModelOf({
      move: "model_repeat",
      modelSentence: "We go to the beach.",
      say: "Nice! Say it with me. We go to the beach!",
    });
    expect(model).toEqual({
      given: true,
      sentence: "We go to the beach.",
      inSay: true,
    });
    const move = teacher({
      move: "model_repeat",
      say: "Nice! Say it with me. We go to the beach!",
      model_sentence: "We go to the beach.",
    });
    expect(move.lead?.model).toEqual({
      sentence: "We go to the beach.",
      inSay: true,
    });
    // 1~3단계: 글에서 빼 소리 줄로 내는 문장(R5 · S1)이 move.sound.model 이다
    expect(move.sound?.model).toBe("We go to the beach.");
    const help = childHelpAfter(move);
    expect(help).toEqual({
      hintKind: "english",
      hintLevel: 0,
      heardHelp: "answer_example",
    });
    expect(said(["go", "beach"], "We go to the beach.", help)).toEqual([]);
  });

  it("AC-26d 대조는 소문자 · 문장 부호 · 축약형을 맞춘 글에서 본다(C127 보완)", () => {
    expect(
      leadModelOf({
        move: "model_repeat",
        modelSentence: "I'm at the beach.",
        say: "Good try! I am at the BEACH, okay?",
      }).inSay,
    ).toBe(true);
    expect(
      leadModelOf({
        move: "model_repeat",
        modelSentence: "I go to the sea.",
        say: "I go to the beach.",
      }).inSay,
    ).toBe(false);
  });

  it("AC-26d move model_repeat 인데 say 에 없는 model_sentence 도 answer_example 이고 어긋남 표지가 남는다(근거를 줄이는 쪽)", () => {
    const move = teacher({
      move: "model_repeat",
      say: "Let's say it together!",
      model_sentence: "I eat rice.",
    });
    expect(move.lead?.model).toEqual({ sentence: "I eat rice.", inSay: false });
    // 글에 없는 문장은 소리 줄로 내지 않는다(아이가 실제로 들은 것만 sound)
    expect(move.sound).toBeUndefined();
    const help = childHelpAfter(move);
    expect(help.hintKind).toBe("english");
    expect(help.heardHelp).toBe("answer_example");
    expect(said(["eat"], "I eat rice.", help)).toEqual([]);
  });

  it("AC-26d model_sentence 가 비지 않으면 move 가 model_repeat 가 아니어도 들려준 것으로 본다, 둘 다 없으면 들려주지 않았다", () => {
    expect(
      leadModelOf({
        move: "react_only",
        modelSentence: "I go to the sea.",
        say: "Wow. I go to the sea.",
      }),
    ).toEqual({ given: true, sentence: "I go to the sea.", inSay: true });
    expect(
      leadModelOf({ move: "model_repeat", modelSentence: "  ", say: "Hi." }),
    ).toEqual({ given: true, sentence: null, inSay: null });
    expect(
      leadModelOf({ move: "react_only", modelSentence: "", say: "Cool!" }),
    ).toEqual({ given: false, sentence: null, inSay: null });
    const none = teacher({ move: "react_only", say: "Cool!" });
    expect(none.lead?.model).toBeUndefined();
    expect(childHelpAfter(none).hintKind).toBe("none");
  });

  it("AC-26d 4단계부터는 따라 할 문장이 글로 남으므로 소리 줄을 두지 않고 move.ai model_line 으로 들은 도움을 적는다", () => {
    const move = teacher(
      {
        move: "model_repeat",
        say: "You can say, I go to the mountain.",
        model_sentence: "I go to the mountain.",
      },
      { spec: MID },
    );
    expect(move.sound).toBeUndefined();
    expect(move.ai).toBe("model_line");
    const help = childHelpAfter(move, MID);
    expect(help.hintKind).toBe("english");
    expect(help.heardHelp).toBe("answer_example");
  });

  it("AC-26d P-K3-s2 차례 11: reading repeated_my_model 인데 Claude 가 eat 를 낸 차례는 따라 할 문장 대조로 said_words 에 없다", () => {
    const prev = teacher({
      move: "model_repeat",
      say: "Good! Say it with me. I eat rice.",
      model_sentence: "I eat rice.",
    });
    const help = childHelpAfter(prev);
    const child = leadStuckOf({
      reading: "repeated_my_model",
      child: "I eat rice.",
      input: "speech",
    });
    expect(child).toEqual({
      aiStuck: false,
      childKind: "answer",
      stuck: false,
    });
    expect(said(["eat"], "I eat rice.", help, child.stuck)).toEqual([]);
  });
});

describe("막힌 뒤 고르기(설계 4 둘째 줄, AC-4)", () => {
  it("AC-26d 막힌 뒤 'Okay! Watch TV, or go outside? Which one?'(or 가 마지막 문장 밖)은 two_answers 다", () => {
    const say = "Okay! Watch TV, or go outside? Which one?";
    expect(
      leadChoicesOf({
        move: "react_and_follow_up",
        say,
        prevStuck: true,
        closing: false,
      }),
    ).toBe(true);
    const move = teacher(
      { move: "react_and_follow_up", say },
      { prevChild: button },
    );
    expect(move.ai).toBe("choices");
    expect(move.lead?.choices).toBe(true);
    const help = childHelpAfter(move);
    expect(help).toEqual({
      hintKind: "english",
      hintLevel: 0,
      heardHelp: "two_answers",
    });
  });

  it("AC-26d 막힌 뒤 마지막 물음 문장의 or('Big or small?')와 move easier_or_choices 의 고르기도 two_answers 다", () => {
    expect(
      leadChoicesOf({
        move: "react_only",
        say: "That's okay. Big or small?",
        prevStuck: true,
        closing: false,
      }),
    ).toBe(true);
    // move 가 easier_or_choices 이면 앞 아이 차례가 막힘이 아니어도 고르기로 적는다
    expect(
      leadChoicesOf({
        move: "easier_or_choices",
        say: "Sea or mountain?",
        prevStuck: false,
        closing: false,
      }),
    ).toBe(true);
  });

  it("AC-26d 보통 차례의 'Do you go in summer or winter?' 는 선택지가 아니다(C205)", () => {
    const say = "Me too! Do you go in summer or winter?";
    expect(
      leadChoicesOf({
        move: "react_and_follow_up",
        say,
        prevStuck: false,
        closing: false,
      }),
    ).toBe(false);
    const move = teacher({ move: "react_and_follow_up", say });
    expect(move.ai).toBe("none");
    expect(move.lead?.choices).toBeUndefined();
    expect(childHelpAfter(move).hintKind).toBe("none");
  });

  it("AC-26d 물음 문장이 아닌 문장의 or · or 로 시작하거나 끝나는 문장은 고르기가 아니다", () => {
    const base = {
      move: "easier_or_choices" as const,
      prevStuck: true,
      closing: false,
    };
    expect(leadChoicesOf({ ...base, say: "Tea or milk is fine." })).toBe(false);
    expect(leadChoicesOf({ ...base, say: "Or what?" })).toBe(false);
    expect(leadChoicesOf({ ...base, say: "What do you like?" })).toBe(false);
  });

  it("AC-26d 말소리 없음 뒤는 막힘이 아니라서 or 물음을 선택지로 적지 않는다", () => {
    expect(leadPrevStuckOf(silent)).toBe(false);
    expect(leadPrevStuckOf(button)).toBe(true);
    expect(leadPrevStuckOf(stuckSpeech)).toBe(true);
    expect(leadPrevStuckOf(spoke)).toBe(false);
    expect(leadPrevStuckOf(null)).toBe(false);
    const move = teacher(
      { move: "react_and_follow_up", say: "Oops! Sea or mountain?" },
      { prevChild: silent },
    );
    expect(move.ai).toBe("none");
  });

  it("AC-26d 두 물음 문장으로 나뉜 고르기('Do you go to the beach? Or the mountain?')도 막힌 뒤면 two_answers · '영어' · said_words 빔이다(R2 검토 I-1)", () => {
    // 실험 C2-K3-s1 · C2-K2-s1 선생님 말의 고르기 꼴을 막힌 뒤 차례에 둔 것
    const say = "That's okay! Do you go to the beach? Or the mountain?";
    expect(hasLeadChoiceQuestion(say)).toBe(true);
    const move = teacher(
      { move: "react_and_follow_up", say },
      { prevChild: stuckSpeech },
    );
    expect(move.ai).toBe("choices");
    expect(move.lead?.choices).toBe(true);
    const help = childHelpAfter(move);
    expect(help).toEqual({
      hintKind: "english",
      hintLevel: 0,
      heardHelp: "two_answers",
    });
    expect(said(["mountain"], "Mountain.", help)).toEqual([]);
    // 고르기로 잡지 않았다면 세었을 말이다(지금 길은 이 차례를 늘 '영어'로 적는다)
    expect(said(["mountain"], "Mountain.", childHelpAfter(null))).toEqual([
      "mountain",
    ]);
  });

  it("AC-26d 실험 C-K3-s2 차례 8 · C-K1-s1 의 막힌 뒤 선생님 말(나뉜 or 물음 뒤 물음 아닌 문장)도 고르기로 잡는다", () => {
    const base = {
      move: "react_and_follow_up" as const,
      prevStuck: true,
      closing: false,
    };
    expect(
      leadChoicesOf({
        ...base,
        say: "Hmm, I didn't catch that. That's okay! Let's try again. Do you eat pizza at home? Or at a restaurant? Say 'home' or 'restaurant'.",
      }),
    ).toBe(true);
    expect(
      leadChoicesOf({
        ...base,
        say: "Hmm, I did not hear that well. Do you mean 'bad'? Or maybe 'sad'? Let me ask again. Is Kongi hungry? Say yes or no.",
      }),
    ).toBe(true);
    // 실험 C-K3-s2 의 보통 차례(앞 아이 차례 막힘 아님)는 나뉜 고르기여도 선택지가 아니다(C205)
    expect(
      leadChoicesOf({
        ...base,
        prevStuck: false,
        say: "Apple juice! Great! So you like cheese pizza and apple juice. That sounds so yummy! Do you eat pizza at home? Or at a restaurant?",
      }),
    ).toBe(false);
  });

  it("AC-26d or 가 없는 물음 둘 · 앞 물음 문장이 없는 'Or' 문장 · 물음 아닌 문장 뒤의 'Or' 물음은 고르기가 아니다", () => {
    expect(hasLeadChoiceQuestion("Do you like it? Do you swim?")).toBe(false);
    expect(hasLeadChoiceQuestion("Okay. Or what?")).toBe(false);
    expect(hasLeadChoiceQuestion("Or?")).toBe(false);
    expect(hasLeadChoiceQuestion("I go to the beach. Or the mountain?")).toBe(
      false,
    );
    const move = teacher(
      { move: "react_and_follow_up", say: "Do you like it? Do you swim?" },
      { prevChild: stuckSpeech },
    );
    expect(move.ai).toBe("none");
    expect(move.lead?.choices).toBeUndefined();
  });

  it("AC-26d 마무리 차례 · move wrap_up 차례의 or 물음은 막힌 뒤라도 고르기로 적지 않는다(설계 4 M2-1, R2 검토 I-2)", () => {
    const say = "Good job today! Do you want to talk more or stop?";
    expect(
      leadChoicesOf({
        move: "react_only",
        say,
        prevStuck: true,
        closing: true,
      }),
    ).toBe(false);
    expect(
      leadChoicesOf({ move: "wrap_up", say, prevStuck: true, closing: false }),
    ).toBe(false);
    const closing = teacher(
      { move: "react_only", say },
      { prevChild: button, closingSlot: true },
    );
    expect(closing.kind).toBe("closing_slot");
    expect(closing.ai).toBe("none");
    expect(closing.lead?.choices).toBeUndefined();
    expect(childHelpAfter(closing).hintKind).toBe("none");
    const wrap = teacher({ move: "wrap_up", say }, { prevChild: stuckSpeech });
    expect(wrap.next).toBe("closing");
    expect(wrap.ai).toBe("none");
    expect(wrap.lead?.choices).toBeUndefined();
    expect(childHelpAfter(wrap).hintKind).toBe("none");
  });
});

describe("되물은 뒤의 답(설계 4 셋째 줄 · 02-2 259줄, AC-4)", () => {
  it("AC-26d 되묻기 사이('On weekends, I go to the mountain.' → 'Pad' → 되묻기 → 'Mountain.')의 답은 되물은 차례의 값을 하한으로 이어 받는다", () => {
    const t1 = teacher({
      move: "model_repeat",
      say: "Say it with me. On weekends, I go to the mountain.",
      model_sentence: "On weekends, I go to the mountain.",
    });
    const padHelp = childHelpAfter(t1);
    expect(padHelp.hintKind).toBe("english");
    const pad = leadStuckOf({
      reading: "likely_misheard",
      child: "Pad",
      input: "speech",
    });
    expect(pad.stuck).toBe(true);
    const t2 = teacher(
      {
        reading: "likely_misheard",
        move: "ask_again",
        say: "Sorry, say it again, please!",
      },
      { prevChild: { input: "speech", stuck: pad.stuck, nospeech: false } },
    );
    expect(isLeadAskAgain(t2)).toBe(true);
    // 되묻는 move 그 자체는 도움이 아니다
    const own = childHelpAfter(t2);
    expect(own.hintKind).toBe("none");
    const floored = leadAskAgainFloorOf(own, padHelp);
    expect(floored).toEqual({
      hintKind: "english",
      hintLevel: 0,
      heardHelp: "answer_example",
    });
    expect(said(["mountain"], "Mountain.", floored)).toEqual([]);
    // 하한이 없었다면 세었을 말이다(이어 받기가 근거를 지운다)
    expect(said(["mountain"], "Mountain.", own)).toEqual(["mountain"]);
  });

  it("AC-26d P-K1-s1 차례 13~15: 고르기 → 'I can see' → 되묻기 → 'Summer.' 의 답은 two_answers · '영어'를 하한으로 이어 받고 되묻기의 받침 단계는 0 이다", () => {
    const lexS = {
      unitWords: [...UNIT_WORDS, "summer"],
      lemmaOf: lemmaLookup([...VOCAB, { word: "summer", forms: ["summers"] }]),
    };
    // 차례 13: 막힘이 아닌데 move 가 easier_or_choices 인 고르기
    const t13 = teacher({
      move: "easier_or_choices",
      say: "OK! You go to the beach. Do you go in summer or winter?",
    });
    expect(t13.ai).toBe("choices");
    const seeHelp = childHelpAfter(t13);
    expect(seeHelp).toEqual({
      hintKind: "english",
      hintLevel: 0,
      heardHelp: "two_answers",
    });
    // 차례 14: 들린 글 'I can see' 는 영어 낱말 셋이라 무름으로 막힘이 아니다
    const see = leadStuckOf({
      reading: "likely_misheard",
      child: "I can see",
      input: "speech",
    });
    expect(see.stuck).toBe(false);
    const t14 = teacher(
      {
        reading: "likely_misheard",
        move: "ask_again",
        say: "You can see something! Sorry, say it again, please!",
      },
      { prevChild: { input: "speech", stuck: see.stuck, nospeech: false } },
    );
    expect(isLeadAskAgain(t14)).toBe(true);
    // 앞 아이 차례가 막힘이 아니므로 받침 행이 아니다
    expect(t14.stage).toBe(0);
    const own = childHelpAfter(t14);
    expect(own.hintKind).toBe("none");
    const floored = leadAskAgainFloorOf(own, seeHelp);
    expect(floored).toEqual({
      hintKind: "english",
      hintLevel: 0,
      heardHelp: "two_answers",
    });
    const summer = (help: LeadChildHelp) =>
      leadSaidWordsOf({
        candidates: ["summer"],
        heard: "Summer.",
        hintKind: help.hintKind,
        speech: true,
        stuck: false,
        askAgain: false,
        homophones: HOMOPHONES,
        ...lexS,
      });
    expect(summer(floored)).toEqual([]);
    expect(summer(own)).toEqual(["summer"]);
  });

  it("AC-26e 선생님이 되물은 아이 차례(다음 move ask_again)는 막힘이 아니어도 '말했다'가 없다(정본 02-2, R2 검토 M-2)", () => {
    const help = childHelpAfter(teacher({ say: "Where do you go?" }));
    const child = leadStuckOf({
      reading: "does_not_fit",
      child: "I can see the sea",
      input: "speech",
    });
    expect(child.stuck).toBe(false);
    expect(
      said(["see", "sea"], "I can see the sea", help, child.stuck, true),
    ).toEqual([]);
    // 되묻지 않았다면 세었을 말이다
    expect(
      said(["see", "sea"], "I can see the sea", help, child.stuck),
    ).toEqual(["see", "sea"]);
  });

  it("AC-26d 하한은 칸마다 큰 쪽이다(힌트 종류 없음 < 뜻만 < 영어 · 쓴 단 수 · 들은 도움 없음 < 답 두 개 < 답 예시)", () => {
    expect(
      leadAskAgainFloorOf(
        { hintKind: "english", hintLevel: 3, heardHelp: "answer_example" },
        { hintKind: "meaning_only", hintLevel: 1, heardHelp: "two_answers" },
      ),
    ).toEqual({
      hintKind: "english",
      hintLevel: 3,
      heardHelp: "answer_example",
    });
    expect(
      leadAskAgainFloorOf(
        { hintKind: "none", hintLevel: 0, heardHelp: null },
        { hintKind: "meaning_only", hintLevel: 1, heardHelp: "two_answers" },
      ),
    ).toEqual({
      hintKind: "meaning_only",
      hintLevel: 1,
      heardHelp: "two_answers",
    });
    expect(
      leadAskAgainFloorOf(
        { hintKind: "meaning_only", hintLevel: 2, heardHelp: "two_answers" },
        { hintKind: "none", hintLevel: 0, heardHelp: null },
      ),
    ).toEqual({
      hintKind: "meaning_only",
      hintLevel: 2,
      heardHelp: "two_answers",
    });
  });

  it("AC-26d 아이 행의 ask_again 은 다음 선생님 move 가 ask_again 일 때만 참이다(옛 행 · move 없음은 거짓)", () => {
    expect(isLeadAskAgain(teacher({ move: "ask_again", say: "Sorry?" }))).toBe(
      true,
    );
    expect(isLeadAskAgain(teacher({ move: "react_only", say: "Oh!" }))).toBe(
      false,
    );
    expect(isLeadAskAgain(talkMoveOf({ kind: "ai" }))).toBe(false);
    expect(isLeadAskAgain(null)).toBe(false);
  });
});

describe("막힘 값과 아이 말 갈래(설계 4 넷째 줄, AC-5)", () => {
  it("AC-26e reading 일곱 값의 갈래 대응과 막힘 값(likely_misheard · does_not_know · does_not_fit 만 참)", () => {
    expect(TALK_LEAD_READINGS.map((r) => [r, leadChildKindOf(r)])).toEqual([
      ["clear_answer", "answer"],
      ["likely_misheard", "not_understood"],
      ["does_not_fit", "unrelated_words"],
      ["new_topic", "new_topic"],
      ["asks_teacher", "new_topic"],
      ["does_not_know", "not_understood"],
      ["repeated_my_model", "answer"],
    ]);
    const stuckOf = (reading: (typeof TALK_LEAD_READINGS)[number]) =>
      leadStuckOf({ reading, child: "Hmm", input: "speech" }).aiStuck;
    expect(TALK_LEAD_READINGS.filter(stuckOf)).toEqual([
      "likely_misheard",
      "does_not_fit",
      "does_not_know",
    ]);
  });

  it("AC-26e 막힘 값 뒤에 지금 무름(effectiveStuckOf)을 건다: 영어 낱말 셋 이상의 말은 막힘이 아니다", () => {
    expect(
      leadStuckOf({
        reading: "does_not_fit",
        child: "I like blue cars",
        input: "speech",
      }).stuck,
    ).toBe(false);
    expect(
      leadStuckOf({ reading: "does_not_fit", child: "Pad", input: "speech" })
        .stuck,
    ).toBe(true);
    // 말 입력이 아니면(단추) 무름을 걸지 않는다(지금 함수 그대로)
    expect(
      leadStuckOf({ reading: "does_not_know", child: "", input: "dont_know" })
        .stuck,
    ).toBe(true);
  });

  it("AC-26e reading likely_misheard 인 'See.'(질문 답 sea)는 무름으로 막힘이 아니고 sea 로 센다(C217 · C203 (1))", () => {
    const child = leadStuckOf({
      reading: "likely_misheard",
      child: "See.",
      input: "speech",
      sceneWords: new Set(["sea", "beach"]),
      homophones: HOMOPHONES,
    });
    expect(child).toEqual({
      aiStuck: true,
      childKind: "not_understood",
      stuck: false,
    });
    const help = childHelpAfter(
      teacher({ say: "Do you go to the sea or the mountain?" }),
    );
    expect(said(["sea"], "See.", help, child.stuck)).toEqual(["sea"]);
  });

  it("AC-26e 막힘인 차례는 '말했다'가 없다", () => {
    const help = childHelpAfter(teacher({ say: "Where do you go?" }));
    expect(said(["beach"], "Beach", help, true)).toEqual([]);
  });
});

describe("지금 판정은 Claude 후보 그대로(설계 4 다섯째 줄, AC-5)", () => {
  it("AC-26e 'Do you go to the beach?' 뒤 'Beach!' 와 'I go to the beach with my mom.' 에서 Claude 가 beach 를 내면 둘 다 said_words 에 있다", () => {
    const help = childHelpAfter(
      teacher({
        move: "react_and_follow_up",
        say: "Fun! Do you go to the beach?",
      }),
    );
    expect(help.hintKind).toBe("none");
    expect(said(["beach"], "Beach!", help)).toEqual(["beach"]);
    expect(said(["beach"], "I go to the beach with my mom.", help)).toEqual([
      "beach",
    ]);
  });

  it("AC-26e Claude 가 냈지만 인식 글에 없는 낱말은 세지 않는다", () => {
    const help = childHelpAfter(teacher({ say: "Where do you go?" }));
    expect(said(["beach", "sea", "mountain"], "Beach!", help)).toEqual([
      "beach",
    ]);
  });

  it("AC-26e 말 입력이 아닌 차례는 빈 목록이다", () => {
    expect(
      leadSaidWordsOf({
        candidates: ["beach"],
        heard: "",
        hintKind: "none",
        speech: false,
        stuck: false,
        askAgain: false,
        homophones: HOMOPHONES,
        ...lex,
      }),
    ).toEqual([]);
  });
});

describe("위치 되짚기의 move 채움(설계 4 위치 되짚기 문단)", () => {
  it("AC-26d 앱이 정한 마무리 차례는 closing_slot, wrap_up 은 next closing, 대화 토막 첫 선생님 행은 first_question, 그 밖은 ai", () => {
    expect(
      teacher({ say: "Do you want to talk more?" }, { closingSlot: true }).kind,
    ).toBe("closing_slot");
    const wrap = teacher({ move: "wrap_up", say: "That was fun!" });
    expect(wrap.kind).toBe("ai");
    expect(wrap.next).toBe("closing");
    expect(
      teacher({ say: "What do you do on weekends?" }, { firstQuestion: true })
        .kind,
    ).toBe("first_question");
    const plain = teacher({ say: "Cool! What do you eat?" });
    expect(plain.kind).toBe("ai");
    expect(plain.next).toBe("none");
    expect(plain.stage).toBe(0);
  });

  it("AC-26d 앞 아이 차례가 막힘이고 move 가 ask_again · easier_or_choices · model_repeat 이면 받침 행이다(쉬운 질문 둘째 · 같이 말하기 첫째)", () => {
    const stageOf = (
      move: LeadResponse["move"],
      prevChild: PrevChild = stuckSpeech,
    ) => teacher({ move, say: "Okay. Sea or mountain?" }, { prevChild });
    expect(stageOf("model_repeat").stage).toBe(TALK_SUPPORT_STAGE_TOGETHER);
    expect(stageOf("easier_or_choices").stage).toBe(TALK_SUPPORT_STAGE_EASY);
    expect(stageOf("ask_again").stage).toBe(TALK_SUPPORT_STAGE_EASY);
    expect(stageOf("react_and_follow_up").stage).toBe(0);
    expect(stageOf("easier_or_choices", spoke).stage).toBe(0);
    expect(stageOf("easier_or_choices", silent).stage).toBe(0);
    expect(stageOf("model_repeat", button).cause).toBe("button");
    expect(stageOf("model_repeat", stuckSpeech).cause).toBe("stuck");
    expect(stageOf("model_repeat", silent).cause).toBe("nospeech");
    expect(stageOf("model_repeat", spoke).cause).toBeNull();
  });

  it("AC-26d 받침 행은 질문 자리를 잇고 그 밖의 물음 문장은 새 자리를 연다(지금 위치 되짚기 함수 그대로)", () => {
    const q1 = "What do you do on weekends?";
    const easy = "That's okay. Sea or mountain?";
    const q2 = "Do you eat on the beach?";
    const turns: TalkLessonTurn[] = [
      // 인사 토막과 인사 끝 반응은 지금 길 그대로(spec 설계 3)
      ...opening3().slice(0, 5),
      {
        speaker: "teacher",
        text: q1,
        move: teacher({ say: q1 }, { firstQuestion: true, prevChild: null }),
      },
      fxButton(),
      {
        speaker: "teacher",
        text: easy,
        move: teacher(
          { move: "easier_or_choices", say: easy },
          { prevChild: button },
        ),
      },
    ];
    const args: LessonArgs = {
      spec: SPEC3,
      card: CARD3,
      newWords: NEW3,
      turns,
      segment: "talk",
      settings: FX_LOW,
      prepWords: CARD3.prep ?? [],
    };
    const held = talkLessonPositionOf(args);
    expect(held.slot?.questions).toEqual([q1, "Sea or mountain?"]);
    expect(held.stuckInSlot).toBe(1);
    // 말로 답한 뒤의 새 물음 문장은 새 자리를 연다
    const next = talkLessonPositionOf({
      ...args,
      turns: [
        ...turns,
        fxSaid(),
        {
          speaker: "teacher",
          text: `Me too! ${q2}`,
          move: teacher({ say: `Me too! ${q2}` }),
        },
      ],
    });
    expect(next.slot?.questions).toEqual([q2]);
    expect(next.stuckInSlot).toBe(0);
    expect(next.talkCount).toBe(held.talkCount + 1);
  });

  it("AC-26d lead 묶음에 reading · move · 물음 문장에 든 단원 단어 · 말 칸에서 찾은 단원 단어를 적는다", () => {
    const move = teacher({
      reading: "new_topic",
      move: "react_and_follow_up",
      say: "I like the sea too! Do you eat on the beach?",
    });
    expect(move.lead).toEqual({
      reading: "new_topic",
      move: "react_and_follow_up",
      asked: ["eat", "beach"],
      said: ["sea", "eat", "beach"],
    });
    expect(TalkMoveSchema.safeParse(move).success).toBe(true);
  });

  it("AC-26d S1 이 채우는 기록(좁은 정의 걸림 · 넓은 검사 수치 · 문장 문 걸림 · 마무리 상수 · 뺀 문장 · 소리 줄 자리 어긋남)을 받아 그대로 싣는다", () => {
    const move = leadTeacherMoveOf({
      response: response({ say: "Do you go in summer?" }),
      prevChild: spoke,
      spec: LOW,
      closingSlot: false,
      firstQuestion: false,
      ...lex,
      extra: {
        narrow: {
          item: "form_season",
          retry: "Do you go there?",
          again: false,
          ms: 2800,
        },
        wide: { offband: 1 },
        gate: ["meta"],
        closingAdded: true,
        removed: ["We go to the beach."],
        soundMoved: true,
      },
    });
    expect(move.lead?.narrow?.ms).toBe(2800);
    expect(move.lead?.closingAdded).toBe(true);
    expect(TalkMoveSchema.safeParse(move).success).toBe(true);
  });
});

describe("move.lead 선택 칸과 옛 행 호환(plan 되돌림 4)", () => {
  it("AC-26d lead 칸이 없는 옛 move 는 그대로 읽히고 만들기 결과에 lead 칸이 생기지 않는다", () => {
    expect("lead" in old).toBe(false);
    const json = JSON.parse(JSON.stringify(old));
    expect(readTalkMove(json)).toEqual(old);
    expect(TalkMoveSchema.safeParse(json).success).toBe(true);
  });

  it("AC-26d lead 가 든 move 는 판 1 그대로 규격을 지나고 읽기 · 쓰기가 같다, lead 의 모르는 칸 · 값은 거부한다", () => {
    const move = teacher({
      move: "model_repeat",
      say: "Say it with me. I eat rice.",
      model_sentence: "I eat rice.",
    });
    expect(move.v).toBe(1);
    const json = JSON.parse(JSON.stringify(move));
    expect(readTalkMove(json)).toEqual(move);
    expect(
      readTalkMove({ ...json, lead: { ...json.lead, extra: 1 } }),
    ).toBeNull();
    expect(
      readTalkMove({ ...json, lead: { ...json.lead, move: "quiz" } }),
    ).toBeNull();
    expect(TALK_LEAD_MOVES).toContain("model_repeat");
  });

  it("AC-26d 원문을 지울 때 lead 의 글(따라 할 문장 · 다시 받은 문장 · 뺀 문장)만 지우고 값은 남긴다", () => {
    const move = leadTeacherMoveOf({
      response: response({
        move: "model_repeat",
        say: "Say it with me. I eat rice.",
        model_sentence: "I eat rice.",
      }),
      prevChild: stuckSpeech,
      spec: LOW,
      closingSlot: false,
      firstQuestion: false,
      ...lex,
      extra: {
        narrow: { item: "form_x", retry: "Do you eat?", again: true, ms: 10 },
        removed: ["I eat rice."],
      },
    });
    const erased = eraseTalkMoveText(move);
    expect(erased.sound).toBeUndefined();
    expect(erased.lead?.model).toEqual({ sentence: "", inSay: true });
    expect(erased.lead?.narrow).toEqual({
      item: "form_x",
      retry: "",
      again: true,
      ms: 10,
    });
    expect(erased.lead?.removed).toEqual([]);
    expect(erased.lead?.asked).toEqual(move.lead?.asked);
    expect(TalkMoveSchema.safeParse(erased).success).toBe(true);
    expect(eraseTalkMoveText(erased)).toEqual(erased);
    // 옛 move 의 지우기는 그대로다(lead 칸이 생기지 않음)
    expect("lead" in eraseTalkMoveText(old)).toBe(false);
  });
});

describe("정리 되짚을 말 출처(leadWrapSourcesOf, plan 확인할 것 9)", () => {
  it("AC-26d 확인된 따라 할 문장만 차례대로 돌려준다(어긋난 문장 · 옛 행 · 아이 행은 빼고)", () => {
    const rows = [
      { move: teacher({ say: "What do you eat?" }) },
      { move: null },
      {
        move: teacher({
          move: "model_repeat",
          say: "Say it with me. I eat rice.",
          model_sentence: "I eat rice.",
        }),
      },
      {
        move: teacher({
          move: "model_repeat",
          say: "Let's say it!",
          model_sentence: "I go to the sea.",
        }),
      },
      { move: old },
      {
        move: JSON.parse(
          JSON.stringify(
            teacher({
              move: "model_repeat",
              say: "We go to the beach. Say it!",
              model_sentence: "We go to the beach.",
            }),
          ),
        ),
      },
    ];
    expect(leadWrapSourcesOf(rows)).toEqual([
      "I eat rice.",
      "We go to the beach.",
    ]);
  });
});

// '회화 AI 몫 넓힘' 묶음 1 고정부(plan 정한 것 1 · 옮겨 적는 문구, spec 판 4 설계 1~4 · AC-2 (가)(라) · AC-3 (다) · AC-4 (나)).
// 4단계부터 시스템 프롬프트 · 사용자 메시지는 고치기 전 골든(tests/fixtures/talk-prompt-l4-before.txt)과 글자까지 같다. 실제 API 를 부르지 않는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  TALK_SITUATION_EXAMPLES,
  talkCallTurnOf,
  talkLessonRulesOf,
  talkLessonSystem,
  talkLessonUserMessage,
} from "@/core/ai/calls/talk-lesson";
import {
  type LessonArgs,
  nextTeacherTurnOf,
  teacherTurnPlansOf,
} from "@/core/conversation/lesson-flow";
import type { TalkLessonTurn } from "@/core/conversation/lesson-turns";
import {
  lemmaOf,
  lessonInput,
  lessonRules,
  values,
} from "../fixtures/ai/talk-lesson-inputs";
import {
  aiTurn,
  button,
  CARD4 as FLOW_CARD4,
  MID,
  NEW4,
  noSpeech,
  SPEC4,
  said,
  teacher,
} from "../fixtures/talk-lesson";

// ── 4단계부터 골든(고치기 전 글 — tests/fixtures/talk-prompt-l4-before.txt) ──────────────
// 이 덩이는 골든을 뜰 때와 글자까지 같은 생성기다(고치지 않는다). 4 · 5 · 10단계 시스템 프롬프트와, 4단계 흐름 계획에서 만든 사용자 메시지
// 다섯 꼴(인사 끝 · AI 차례(말 입력, If stuck 포함) · 들리지 않음 · 따라가기 상한에 닿음 · 단추 막힘)을 잇는다.
const GOLDEN_FEELING_WORDS = ["happy", "fun", "tired"];
function upperFlow(turns: TalkLessonTurn[]): LessonArgs {
  return {
    spec: SPEC4,
    card: FLOW_CARD4,
    newWords: NEW4,
    turns,
    segment: "talk",
    settings: MID,
    prepWords: [],
  };
}
function upperOpening(): TalkLessonTurn[] {
  return [
    teacher("Hi! How was your day?", { kind: "first_question" }),
    said({ segment: "greeting_end" }),
    teacher("Nice! Let's talk.", { kind: "ai" }),
    teacher("What is your favorite subject?", {
      kind: "first_question",
      item: { kind: "required", no: 1 },
      words: ["math"],
    }),
  ];
}
function upperSpeechTurn(
  prefix: TalkLessonTurn[],
  child: string,
  segment: "greeting" | "talk" = "talk",
) {
  const { ifAnswered, ifStuck } = teacherTurnPlansOf(upperFlow(prefix), {
    segment,
    targets: [],
  });
  return talkCallTurnOf({
    plan: ifAnswered,
    ifStuck,
    child,
    input: "speech",
    hintKind: "none",
    hintTier: 0,
    heardHelp: "none",
    feelingWords: GOLDEN_FEELING_WORDS,
    lemmaOf,
  });
}
function upperDontKnowTurn(turns: TalkLessonTurn[]) {
  return talkCallTurnOf({
    plan: nextTeacherTurnOf(upperFlow(turns)),
    child: "",
    input: "dont_know",
    hintKind: "none",
    hintTier: 0,
    heardHelp: "none",
    feelingWords: GOLDEN_FEELING_WORDS,
    lemmaOf,
  });
}
function upperGolden(): string {
  const parts: string[] = [];
  for (const level of [4, 5, 10])
    parts.push(
      `=== system level ${level} ===`,
      talkLessonSystem(lessonInput(level), lessonRules(level)),
    );
  const greetingEnd = {
    ...upperSpeechTurn(
      [teacher("Hi! How was your day?", { kind: "first_question" })],
      "I am happy. It was fun today.",
      "greeting",
    ),
    nextPart: "talk" as const,
  };
  parts.push(
    "=== user greeting_end (first turn) ===",
    talkLessonUserMessage(greetingEnd, {
      line: "Hi! How was your day?",
      teacherNameEn: "Mina",
    }),
  );
  parts.push(
    "=== user ai (speech) ===",
    talkLessonUserMessage(
      upperSpeechTurn(upperOpening(), "I like math. It is fun and I am happy."),
    ),
  );
  parts.push(
    "=== user nospeech ===",
    talkLessonUserMessage(upperDontKnowTurn([...upperOpening(), noSpeech()])),
  );
  const followed: TalkLessonTurn[] = [
    ...upperOpening(),
    said(),
    aiTurn("Oh, a dog! Is your dog big?", { next: "follow_child" }),
    said(),
    aiTurn("Wow! What color is it?", { next: "follow_child" }),
  ];
  parts.push(
    "=== user follow cap reached ===",
    talkLessonUserMessage(upperSpeechTurn(followed, "My dog is white.")),
  );
  parts.push(
    "=== user button stuck ===",
    talkLessonUserMessage(upperDontKnowTurn([...upperOpening(), button()])),
  );
  return `${parts.join("\n")}\n`;
}
// ── 골든 생성기 끝 ─────────────────────────────────────────────

const GOLDEN_PATH = join(
  process.cwd(),
  "tests/fixtures/talk-prompt-l4-before.txt",
);

describe("4단계부터 고정부 · 사용자 메시지 불변(plan 정한 것 1 · 위험 3)", () => {
  it("4 · 5 · 10단계 시스템 프롬프트와 4단계 사용자 메시지 다섯 꼴이 고치기 전 골든과 글자까지 같다", () => {
    expect(upperGolden()).toBe(readFileSync(GOLDEN_PATH, "utf8"));
  });
});

// ── 1~3단계 고정부(정본 6.1 표 1~3 행 · 02-2 3.3) ─────────────────────────

const rulesWith = (level: number, over: Record<string, unknown>) =>
  talkLessonRulesOf({ ...values, ...over }, { level });
const system3 = (over: Record<string, unknown> = {}) =>
  talkLessonSystem(lessonInput(3), rulesWith(3, over));
/** 1단계 꼴(단계 규격 choices 참 — 견본은 3단계 규격에 choices 만 켬). */
const system1 = () => {
  const input = lessonInput(3);
  return talkLessonSystem(
    { ...input, spec: { ...input.spec, choices: true } },
    lessonRules(3),
  );
};
const system4 = (over: Record<string, unknown> = {}) =>
  talkLessonSystem(lessonInput(4), rulesWith(4, over));

describe("4단계는 새 설정 키를 바꿔도 고정부가 같다(plan 정한 것 1)", () => {
  it("talk.greeting_recall 켬 · talk.self_line_every_turns 5 에서도 4 · 5 · 10단계 시스템 프롬프트가 기본값과 글자까지 같다", () => {
    const over = {
      "talk.greeting_recall": "on",
      "talk.self_line_every_turns": 5,
    };
    for (const level of [4, 5, 10])
      expect(
        talkLessonSystem(lessonInput(level), rulesWith(level, over)),
        `level ${level}`,
      ).toBe(talkLessonSystem(lessonInput(level), lessonRules(level)));
  });
});

describe("상황 차례 예(AC-2 (가) · spec 설계 1 · 2)", () => {
  it("자리마다(인사 끝 두 갈래 · 받침 셋 · 들리지 않음) 꼴이 다른 예가 셋 이상이고, 고정부에는 목록이 없으며(사용자 메시지 'Example line' 으로 하나씩 — 판정 r1 I-1 (가)) 4단계에는 없다", () => {
    const three = system3();
    const four = system4();
    const places = Object.entries(TALK_SITUATION_EXAMPLES);
    expect(places.map(([place]) => place)).toEqual([
      "greetingEndPrep",
      "greetingEndTalk",
      "together",
      "easy",
      "close",
      "nospeech",
    ]);
    for (const [place, examples] of places) {
      expect(examples.length, place).toBeGreaterThanOrEqual(3);
      expect(new Set(examples).size, place).toBe(examples.length);
      for (const line of examples) {
        expect(three, `${place}: ${line}`).not.toContain(`'${line}'`);
        // 같이 말하자 · 따라 하라는 말 · 질문은 예에 없다(신호 말은 앱 몫, C204 (5) · C207)
        // [M-1] 듣고 따라 하라는 신호 말 꼴('Listen …')도 예에 없다(같은 고정부의 신호 말 금지 줄)
        expect(line, place).not.toMatch(/\?|say it|together|repeat|listen/i);
      }
    }
    // 4단계 고정부에는 1~3단계 들리지 않음 예가 없다(표에서 읽는다 — 예 글자를 박으면 예가 바뀔 때 늘 참이 된다)
    for (const line of TALK_SITUATION_EXAMPLES.nospeech) {
      expect(four, line).not.toContain(line);
      // 'my ears' 꼴은 예에 두지 않는다(13절 C217 (3) — 요청자 iPad 수업 11-08)
      expect(line).not.toMatch(/my ears/i);
    }
    expect(three).toContain(
      "Never copy it or any of its sentences word for word, never use a line made for another place, and never repeat a sentence you already said in this conversation",
    );
  });

  it("1~3단계 고정부에 고정 문장 하나뿐인 받침 · 들리지 않음 줄('That's okay! Let's say it together.' · 'I couldn't hear you.' 로 시작)이 없고 4단계에는 그대로다", () => {
    const three = system3();
    const four = system4();
    for (const old of [
      "'That's okay! Let's say it together.'",
      "'That's okay! Let's move on.'",
      "Start with 'I couldn't hear you.'.",
    ]) {
      expect(three).not.toContain(old);
      expect(four).toContain(old);
    }
    expect(three).toContain(
      "It is a technical problem: never treat it as the child's answer, as not knowing or as a mistake, never blame the child, and never praise or say back words you did not hear.",
    );
    expect(three).toContain(
      "react first to the child's greeting answer (the feeling or what the child added) like a person",
    );
  });
});

describe("지난 대화 꺼내기(AC-2 (라) · talk.greeting_recall)", () => {
  const RECALL =
    "you may bring up one thing written in 'Summaries of earlier talks'";

  it("끔(시드 기본값)이면 1~3단계 고정부에 요약 꺼내기 줄이 없고, 켬이면 있다", () => {
    expect(values["talk.greeting_recall"]).toBe("off");
    expect(system3()).not.toContain(RECALL);
    expect(system3({ "talk.greeting_recall": "on" })).toContain(RECALL);
    expect(system3({ "talk.greeting_recall": "on" })).toContain(
      "Never say anything about earlier talks that is not written there.",
    );
  });
});

describe("말 길이 · 자기 이야기 · 지어낸 경험(AC-3 (다) · C211 (1)(2)(3))", () => {
  it("옮겨 적는 문구 셋(말 길이 · 자기 이야기 빈도 · 지어낸 경험 금지)이 1~3단계 고정부에 그대로 있고 4단계에는 없다", () => {
    const n = values["talk.self_line_every_turns"] as number;
    const lines = [
      "Keep it short and easy. One short reaction and one question is the usual turn. A second sentence is allowed, not expected.",
      `at most once in ${n} turns, only when it helps.`,
      "Do not tell made-up past experiences or memories as if they were true.",
    ];
    for (const line of lines) {
      expect(system3()).toContain(line);
      expect(system1()).toContain(line);
      expect(system4()).not.toContain(line);
    }
  });

  it("자기 이야기 간격과 반응 문장 수는 설정값을 따라 바뀐다", () => {
    expect(system3({ "talk.self_line_every_turns": 5 })).toContain(
      "at most once in 5 turns, only when it helps.",
    );
    const max = values["talk.teacher_sentences_max.1-3"] as number;
    expect(system3()).toContain(
      `The reaction before your question has at most ${max - 1} sentences.`,
    );
    expect(system3({ "talk.teacher_sentences_max.1-3": max + 1 })).toContain(
      `The reaction before your question has at most ${max} sentences.`,
    );
  });

  it("고정부에 품질 지표의 수치 · 비율 문구가 없다(C211 (2))", () => {
    for (const text of [system3(), system1()])
      expect(text).not.toMatch(
        /%|\bpercent\b|\bratio\b|\bper cent\b|\baverage\b|\bmetrics?\b/i,
      );
  });

  it("'Child said more' · 돌아오기 · Follow up · 둘째 인사 · 끝인사 줄이 1~3단계에만 있다", () => {
    const lines = [
      "only when 'Child said more: yes', or when the child brings up a new topic or asks you something.",
      "When 'Come back to today's topic in this turn: yes', come back in this turn with a question that links the child's topic to today's scene",
      "When 'Follow up on the child's answer: yes', the child just answered 'App question just before' (the scene question). Follow up on that answer (next_move follow_up), and never ask the scene question again.",
      "Levels 1-3, Segment greeting with Turn ai and 'Question: yes': react to the child's answer and ask one greeting question, with no choices.",
      // 끝인사는 아이가 한 말 하나를 짚고 낱말을 세지 않는다(13절 C217 (3))
      "Levels 1-3, the farewell: point at one thing the child said or liked today and say goodbye. Never list or count the words the child said (not 'You said eat and drink today.'); say one natural line about that one thing. If the child said almost nothing, do not point at anything. At most two sentences and no question.",
    ];
    for (const line of lines) {
      expect(system3()).toContain(line);
      expect(system4()).not.toContain(line);
    }
  });
});

describe("[M-3] 아이 이야기 따라가기는 1~3단계에서 돌아오기 알림 전에 끊지 않는다(C211 (1) · 02-2 194줄)", () => {
  it("1~3단계 따라가기 줄은 '상한 안에 돌아오라' 대신 알림 때 돌아오게 하고, 4단계 줄은 그대로다", () => {
    const n = values["talk.follow_child_turns"] as number;
    const old = `follow it for at most ${n} turns (next_move follow_child) and come back to today's topic within them.`;
    expect(system3()).not.toContain(old);
    expect(system4()).toContain(old);
    expect(system3()).toContain(
      `following it comes first: follow it for up to ${n} turns (next_move follow_child) and do not cut it short to come back to today's topic. When it is time to come back, the app says 'Come back to today's topic in this turn: yes'.`,
    );
  });
});

describe("소리 줄 자리 · 신호 말(AC-4 (나) · C205 · C207)", () => {
  it("'자주' 고르기 꼴 줄은 1단계에만 있고 2~3단계 고정부에는 없다", () => {
    expect(system1()).toContain(
      "At this level, ask yes-or-no or choice questions often, and keep the choice answers inside the question sentence (e.g. 'Is it a cat or a dog?').",
    );
    expect(system3()).not.toMatch(/often/);
    expect(system3()).toContain(
      "A this-or-that question has only the question: never fill choices for it.",
    );
  });

  it("1단계 선택지 줄은 처음 꺼내는 새 단어(next_move introduce)와 아직 만나지 않은 단어를 노리는 카드 필수 질문(next_move required)에서만 채우고 받침 둘째 밖의 이어 묻기에는 채우지 않으며, 2~3단계 · 4단계 줄은 그대로다(검토 I-1 · N-1 · N-2 · C205)", () => {
    const introduce =
      "Fill choices only at Support stage 2, or when your next question brings up a word from 'Chances, new words to introduce' for the first time (next_move introduce), or when you ask a card required question whose target word the child has not met yet (next_move required). Outside Support stage 2, never fill choices for a follow-up question (next_move follow_up or follow_child).";
    expect(system1()).toContain(introduce);
    expect(system1()).not.toContain("when you first ask about a new word");
    expect(system3()).not.toContain(introduce);
    expect(system3()).toContain(
      "Fill choices only at Support stage 2. Choices are two sentences of the same shape.",
    );
    expect(system4()).not.toContain(
      "(next_move required). Outside Support stage 2",
    );
  });

  it("1~3단계 선생님은 신호 말을 쓰지 않는다(앱이 소리 줄 앞에 붙임)", () => {
    for (const text of [system3(), system1()]) {
      expect(text).toContain(
        "Never write a cue to listen or say (like 'Listen and say!' or 'Your turn!'); the app adds it before the sound line.",
      );
      expect(text).not.toContain("end tori_en with a cue");
      expect(text).not.toContain("may come after it");
    }
  });
});

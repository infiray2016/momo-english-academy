// 회화 수업 새 흐름 순수 모듈 시험 견본(회화 plan 묶음 5): 3단계 새 꼴 카드 보기 · talk_turns 가벼운 꼴 만들기 · 시험용 설정.
// 묶음 3 의 시험 builders(tests/fixtures/seed/builders.ts)와 따로 둔다(나란히 도는 동안 겹치지 않게). 카드는 흐름이 읽는 칸만 둔다.
import type {
  TalkLessonCard,
  TalkLessonChildTurn,
  TalkLessonItem,
  TalkLessonSettings,
  TalkLessonSpec,
  TalkLessonTeacherTurn,
  TalkLessonTurn,
} from "@/core/conversation/lesson-turns";
import { talkLessonSettingsFrom } from "@/core/conversation/lesson-turns";
import { type TalkMove, talkMoveOf } from "@/core/conversation/move";
import { testSettingValues } from "./settings";

export const values = testSettingValues();
export const read = (key: string) => values[key];
export const LOW: TalkLessonSettings = talkLessonSettingsFrom(read, "1-3");
export const MID: TalkLessonSettings = talkLessonSettingsFrom(read, "4-6");

export const SPEC3: TalkLessonSpec = {
  band: "1-3",
  targetTurns: 15,
  koMeaning: true,
};
export const SPEC4: TalkLessonSpec = {
  band: "4-6",
  targetTurns: 20,
  koMeaning: true,
};

const GOAL = "talk-3-1-1";

function item(
  no: number,
  en: string,
  targets: string[],
  ask: "first" | "re_ask",
): TalkLessonItem {
  return {
    no,
    en,
    ko: `뜻 ${no}`,
    targets,
    goals: [GOAL],
    answerExample: `Answer ${ask} ${no}.`,
    easyQuestion: { en: `Easy ${ask} ${no}?`, ko: `쉬운 ${no}` },
  };
}

/** 3단계 배정 수업 카드: 인사 둘 · 필수 질문 셋 · 더 이야기할 거리 셋 · 짧은 준비 셋. */
export const CARD3: TalkLessonCard = {
  greetingTurns: 2,
  greeting: {
    questions: [
      {
        question: { en: "How are you today?", ko: "오늘 기분 어때?" },
        hintKo: "기분",
        hintEn: "I'm good.",
        answerExample: "I'm good.",
      },
      {
        question: { en: "Do you like Sunday?", ko: "일요일 좋아해?" },
        hintKo: "좋아해",
        hintEn: "Yes, I do.",
        answerExample: "Yes, I do.",
      },
    ],
  },
  prep: ["play", "soccer", "sunday"],
  required: [
    item(1, "What do you do on the weekend?", ["play"], "first"),
    item(2, "What sport is fun?", ["soccer"], "first"),
    item(3, "When is your free day?", ["sunday"], "first"),
  ],
  more: [
    item(1, "What do you do after school?", ["play"], "re_ask"),
    item(2, "Who is your friend?", ["soccer"], "re_ask"),
    item(3, "What day is it today?", ["sunday"], "re_ask"),
  ],
};
/** 이번 수업 새 단어(카드 오늘 쓸 말 — weekend 는 짧은 준비에 없다). */
export const NEW3 = ["play", "soccer", "sunday", "weekend"];

/** 4단계 카드(인사는 선생님 첫 말, 짧은 준비 낱말 없음). */
export const CARD4: TalkLessonCard = {
  greetingTurns: 1,
  greeting: {
    firstLine: { en: "Hi! How was your day?", ko: "안녕! 오늘 어땠어?" },
  },
  required: [
    item(1, "What is your favorite subject?", ["math"], "first"),
    item(2, "Which class is hard?", ["difficult"], "first"),
  ],
  more: [item(1, "What do you study at home?", ["math"], "re_ask")],
};
export const NEW4 = ["math", "difficult"];

export function child(
  over: Partial<Omit<TalkLessonChildTurn, "speaker">> = {},
): TalkLessonChildTurn {
  return {
    speaker: "child",
    segment: "talk",
    input: "speech",
    stuck: false,
    nospeech: false,
    targets: [],
    ...over,
  };
}
export const said = (
  over: Partial<Omit<TalkLessonChildTurn, "speaker">> = {},
) => child(over);
export const button = (
  over: Partial<Omit<TalkLessonChildTurn, "speaker">> = {},
) => child({ input: "dont_know", ...over });
export const stuckSaid = (
  over: Partial<Omit<TalkLessonChildTurn, "speaker">> = {},
) => child({ stuck: true, ...over });
export const noSpeech = (
  over: Partial<Omit<TalkLessonChildTurn, "speaker">> = {},
) => child({ input: "dont_know", nospeech: true, ...over });

export function teacher(
  text: string,
  move: Partial<Omit<TalkMove, "v">> & Pick<TalkMove, "kind">,
  answerExample?: string,
): TalkLessonTeacherTurn {
  return {
    speaker: "teacher",
    text,
    move: talkMoveOf(move),
    ...(answerExample === undefined ? {} : { answerExample }),
  };
}

/** AI 차례 선생님 행(갈래 · 카드 항목 · 노린 단어). */
export function aiTurn(
  text: string,
  over: Partial<Omit<TalkMove, "v" | "kind">> = {},
  answerExample = "AI answer.",
): TalkLessonTeacherTurn {
  return teacher(text, { kind: "ai", ...over }, answerExample);
}

/** 인사 둘 → 인사 끝 반응 → 대화 첫 질문(필수 1)까지 온 3단계 행. */
export function opening3(): TalkLessonTurn[] {
  return [
    teacher("Hi! How are you today?", { kind: "first_question" }),
    said({ segment: "greeting" }),
    teacher("Great! Do you like Sunday?", { kind: "card_slot" }),
    said({ segment: "greeting_end" }),
    teacher("Me too! Let's learn some new words!", { kind: "ai" }),
    teacher("What do you do on the weekend?", {
      kind: "first_question",
      item: { kind: "required", no: 1 },
      words: ["play"],
      goals: [GOAL],
    }),
  ];
}

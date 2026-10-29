// 회화 턴 · 끝맺음 턴 규격(6.1 회화 턴 두 행 · 고정부 공통 · 구간 규칙 · 이름 가림 · 프롬프트 캐시 · 정규화, 6.2 회화 턴 행과
// 그 아래 문단, 6.4 실시간 출력 검사 · C5 · C19 · C20 · C21 · C33 · C36 · C44 · C89 · C95, plan-p13a 파일별 값 1 · 정할 것 회7).
// 두 목적(talk_turn · talk_closing)이 같은 응답 규격 · 같은 고정부를 쓴다(캐시가 깨지지 않게). 흘려 받기는 stream.ts.
// 회화 고정부는 P9b 공통 규칙(해요체 지시)을 쓰지 않는다 — 선생님 말의 뜻 · 설명은 친구 말투(반말)다(6.1, 위험 7).
// 고정부 첫머리는 그 대화 선생님의 블록(명단의 영어 이름 · 성격 글, 6.1 · C117 · C130)이고, 다람쥐 · 옛 이름은 고정부 · 사용자
// 메시지 · 스키마 어디에도 두지 않는다. 출력 칸 이름(tori_en · tori_ko …)은 그대로다(C130 (9), 선생님 화면 plan 값 8).
// 순수 모듈이다(시각 · DB · SDK 없음).
import { z } from "zod";
import {
  type ApplyChecksResult,
  buildSystem,
  CallSettingError,
  type CallSpec,
  type ChatMessage,
  hitUnder,
  type LevelContext,
  levelVariable,
  prepareAnswer,
  type SettingValues,
} from "@/core/ai/calls/common";
import type { Masker } from "@/core/ai/mask";
import type { CheckField, FieldHit } from "@/core/ai/output-check";
import { isQuestionSentence } from "@/core/conversation/stream";
import type { TalkLevelSpec } from "@/core/seed/schema/reference";
import type { TalkCard } from "@/core/seed/schema/talk";
import {
  type FormRule,
  formsIn,
  isEnglishSentence,
  sentenceWords,
  splitSentences,
  tokenize,
} from "@/core/seed/text";

/** 응답 규격 제목(두 목적이 같은 규격, 6.2). 가짜 Anthropic 이 이 제목으로 고른다. */
export const TALK_TITLE = "talk_turn";
/** 답 두 개 사이에 읽는 말(3.3 'I'm nine.' · 'Or' · 'I'm ten.'). */
export const TWO_ANSWERS_JOINER = "Or";

// ── 입력 ─────────────────────────────────────────────────────────

/** 이 턴의 토막(6.2 — 인사 · 인사 끝 · 대화 · 더 이야기하기). */
export const TALK_TURN_SEGMENTS = [
  "greeting",
  "greeting_end",
  "talk",
  "more_talk",
] as const;
export type TalkTurnSegment = (typeof TALK_TURN_SEGMENTS)[number];
/** 입력 방식(말 · 모름). */
export const TALK_INPUT_MODES = ["speech", "dont_know"] as const;
export type TalkInputMode = (typeof TALK_INPUT_MODES)[number];
/** 힌트 종류(3.3 — 영어 · 뜻만 · 없음). */
export const TALK_HINT_KINDS = ["none", "meaning_only", "english"] as const;
export type TalkHintKind = (typeof TALK_HINT_KINDS)[number];
/** 들은 도움(1단계 답 두 개 · 답 예시, 둘 다면 답 예시 — C89). */
export const TALK_HEARD_HELPS = [
  "none",
  "two_answers",
  "answer_example",
] as const;
export type TalkHeardHelp = (typeof TALK_HEARD_HELPS)[number];

/** 단계 규격 가운데 회화 턴이 쓰는 칸(level_specs 회화 행). */
export type TalkSpecView = Pick<
  TalkLevelSpec,
  | "mode"
  | "targetTurns"
  | "hintTiers"
  | "usablePhrases"
  | "missions"
  | "cardShape"
  | "koMeaning"
>;

/** 대화 첫 턴과 값이 바뀐 턴에만 사용자 메시지에 넣는 값(6.1 · B5-13). */
export type TalkTurnContext = {
  /** 아직 '안다'가 아닌 단원 단어. */
  unknownWords: string[];
  /** 그 가운데 이미 만난 단어. */
  metUnknownWords: string[];
  /** 이번 수업 새 단어. */
  newWords: string[];
  friendship: number;
  /** 5~7단계 끝낸 미션 번호. */
  missionsDone: number[];
};

/** 이번 턴의 사용자 메시지 재료(늘 넣는 값 + 바뀐 값). */
export type TalkTurn = {
  /** 아이 말(가린 뒤 · 이름 묻기 턴은 {NAME} 자리까지 바꾼 뒤). '모름' · 끝맺음은 빈 글. */
  child: string;
  input: TalkInputMode;
  segment: TalkTurnSegment;
  hintKind: TalkHintKind;
  /** 쓴 힌트 단 수. */
  hintTier: number;
  heardHelp: TalkHeardHelp;
  /** 같은 질문에서 '모름'이 몇 번째인지(질문이 바뀌면 0). */
  dontKnowCount: number;
  targetReached: boolean;
  closing: boolean;
  levelTest: boolean;
  /** 1~3단계 '더 이야기할 거리'를 다 썼다. */
  moreTalkUsedUp: boolean;
  /**
   * 1~3단계: 이번 턴에 답하면 다음 질문이 AI 자리다(흐름 판정 — flow `nextQuestionIsAi`, 목표 턴 전 · 뒤 모두, 13절 C100).
   * 참이면 AI 가 다음 질문 · 힌트 · 노리는 단어 · 답 예시를 따로 둔 칸에 쓴다.
   */
  aiQuestionSlot: boolean;
  /** 첫 턴과 값이 바뀐 턴에만(talkContextDelta). */
  context?: Partial<TalkTurnContext>;
};

export type TalkHistoryEntry = {
  /** 그 턴에 보낸 사용자 메시지 전문(talk_turns 에 저장한 글 그대로). */
  user: string;
  /** 다시 쓸 토리 차례(toriRewriteOf 로 만든 글 그대로). */
  assistant: string;
};

/** 고정부 선생님 블록의 재료(명단의 영어 이름 · AI 성격 글, 6.1 — 서버 teacherPromptOf). */
export type TalkTeacher = { nameEn: string; personaEn: string };

export type TalkTurnInput = LevelContext & {
  spec: TalkSpecView;
  /** 이 대화의 선생님(처음 스냅숏 키 — 한 대화는 끝까지 같은 선생님, 6.1 '캐시'). */
  teacher: TalkTeacher;
  card: TalkCard;
  /** 대화 시작 때 읽어 고정한 지난 대화 요약(최근 talk.memory_summaries 개). */
  summaries: readonly string[];
  history: readonly TalkHistoryEntry[];
  turn: TalkTurn;
  /** 첫 턴만: 앱의 첫 말(첫 메시지가 사용자 메시지여야 하므로 첫 사용자 메시지 앞머리에 넣는다). */
  openingLine?: string;
  /** 표기형 → 원형(vocab forms, P11a lemmaLookup). */
  lemmaOf: (surface: string) => string | undefined;
};

export type TalkRules = {
  goodLines: number;
  /** 이 단계의 다음엔 이렇게 수(talk.next_time_lines 에 단계가 없으면 0). */
  nextTimeLines: number;
  feedbackFromLevel: number;
  summaryMaxChars: number;
  reaskEvery: number;
  followUpEvery: number;
  /** talk.dontknow_max — 4단계부터 같은 질문에 이만큼 '모름'이면 다음 질문(3.3). */
  dontknowMax: number;
};

const KEYS = {
  goodLines: "talk.good_lines",
  nextTimeLines: "talk.next_time_lines",
  feedbackFromLevel: "talk.feedback_from_level",
  summaryMaxChars: "talk.summary_max_chars",
  reaskEvery: "talk.reask_sentence_every_turns",
  followUpEvery: "talk.follow_up_min_every_turns",
  dontknowMax: "talk.dontknow_max",
} as const;
const Count = z.int().min(0);
const Positive = z.int().min(1);
const SETTING_SCHEMAS = {
  [KEYS.goodLines]: Count,
  [KEYS.nextTimeLines]: z.record(z.string(), Count),
  [KEYS.feedbackFromLevel]: Positive,
  [KEYS.summaryMaxChars]: Positive,
  [KEYS.reaskEvery]: Positive,
  [KEYS.followUpEvery]: Positive,
  [KEYS.dontknowMax]: Positive,
} as const;

function readSetting<T>(
  values: SettingValues,
  key: keyof typeof SETTING_SCHEMAS,
): T {
  const parsed = SETTING_SCHEMAS[key].safeParse(values[key]);
  if (!parsed.success) throw new CallSettingError(key, "없거나 꼴이 틀렸다");
  return parsed.data as T;
}

function talkRulesOf(values: SettingValues, input: TalkTurnInput): TalkRules {
  const nextTime = readSetting<Record<string, number>>(
    values,
    KEYS.nextTimeLines,
  );
  return {
    goodLines: readSetting<number>(values, KEYS.goodLines),
    nextTimeLines: nextTime[String(input.level)] ?? 0,
    feedbackFromLevel: readSetting<number>(values, KEYS.feedbackFromLevel),
    summaryMaxChars: readSetting<number>(values, KEYS.summaryMaxChars),
    reaskEvery: readSetting<number>(values, KEYS.reaskEvery),
    followUpEvery: readSetting<number>(values, KEYS.followUpEvery),
    dontknowMax: readSetting<number>(values, KEYS.dontknowMax),
  };
}

/** 힌트 영어 단 수(level_specs hintTiers 에서 'ko' 를 뺀 수, C20 — 4~5 · 6~7 둘, 8~9 하나, 10~12 없음). */
export function englishHintTiersOf(
  spec: Pick<TalkSpecView, "hintTiers">,
): number {
  return spec.hintTiers.filter((tier) => tier !== "ko").length;
}

/** 1~3단계 꼴(카드 턴 목록) — 질문을 앱이 카드에서 붙인다. 4단계부터는 카드 질문 목록. */
const isTurnsShape = (spec: Pick<TalkSpecView, "cardShape">) =>
  spec.cardShape === "turns";

// ── 응답 규격(6.2 — 모두 required, null 없음, 칸 차례 그대로 · stuck 이 맨 앞 C127) ─────

function talkWire(input: TalkTurnInput, rules: TalkRules) {
  const tiers = englishHintTiersOf(input.spec);
  return z
    .object({
      // 막힘 판단을 tori_en 앞에 둔다 — 서버가 흘려 받는 처음에 알아 겹치는 토리 문장만 잡아 둔다(13절 C127)
      stuck: z
        .boolean()
        .describe(
          "True if the child's words mean they did not understand, or are one or two words unrelated to the question",
        ),
      tori_en: z
        .string()
        .describe("Your English words. Empty string in the closing turn"),
      tori_ko: z
        .string()
        .describe(
          "Korean meaning of tori_en in casual 반말 (levels with Korean meaning only). Otherwise empty",
        ),
      recast: z
        .string()
        .describe("The correct sentence you said back. Empty if none"),
      explanation: z
        .string()
        .describe(
          "Short Korean explanation in 반말 on a don't-know turn. Otherwise empty",
        ),
      new_words: z.array(z.string()).describe("New words in this turn"),
      self_used_words: z
        .array(z.string())
        .describe(
          "Unit words the child used correctly by themselves (not words echoed from your previous line)",
        ),
      mission_done: z
        .array(z.int())
        .describe("Numbers of missions finished in this turn (levels 5-7)"),
      card_question_no: z
        .int()
        .describe(
          "Card question number of the next question (level 4 and above). 0 for a follow-up question",
        ),
      next_question_en: z
        .string()
        .describe(
          "Levels 1-3, only when the more-talk material is used up: the next question. Otherwise empty",
        ),
      next_question_ko: z
        .string()
        .describe("Korean meaning of next_question_en. Otherwise empty"),
      next_hint_ko: z
        .string()
        .describe("Korean meaning hint for the next turn. Otherwise empty"),
      next_hints: z
        .array(z.string())
        .describe(
          `English hint tiers for the next turn (frame, sentence), ${tiers} at this level`,
        ),
      next_usable_phrases: z
        .array(z.string())
        .describe(
          `Useful phrases for the next turn, ${input.spec.usablePhrases} at this level`,
        ),
      next_targets: z
        .array(z.string())
        .describe("Unit words the next turn aims at"),
      next_answer_example: z
        .string()
        .describe("Answer example for the next turn"),
      farewell: z.string().describe("Closing turn only: farewell in English"),
      farewell_ko: z
        .string()
        .describe("Closing turn only: Korean meaning of the farewell in 반말"),
      good_lines: z
        .array(z.string())
        .describe(
          `Closing turn only, from level ${rules.feedbackFromLevel}: ${rules.goodLines} lines the child said well`,
        ),
      next_time_lines: z
        .array(z.string())
        .describe(
          `Closing turn only, from level ${rules.feedbackFromLevel}: ${rules.nextTimeLines} 'next time say it like this' lines`,
        ),
      summary: z
        .string()
        .describe(
          `Closing turn only: Korean summary of this conversation, at most ${rules.summaryMaxChars} characters`,
        ),
    })
    .meta({ title: TALK_TITLE });
}

export type TalkOutput = z.infer<ReturnType<typeof talkWire>>;

/** 느슨한 규격: tori_en(글)만 반드시, 나머지는 꼴이 틀리거나 없으면 빈 값. */
const str = z.string().catch("");
const strs = z
  .array(z.unknown())
  .catch([])
  .transform((list) => list.filter((v): v is string => typeof v === "string"));
const talkLoose = z.object({
  stuck: z.boolean().catch(false),
  tori_en: z.string(),
  tori_ko: str,
  recast: str,
  explanation: str,
  new_words: strs,
  self_used_words: strs,
  mission_done: z
    .array(z.unknown())
    .catch([])
    .transform((list) => list.filter((v): v is number => Number.isInteger(v))),
  card_question_no: z.number().catch(0),
  next_question_en: str,
  next_question_ko: str,
  next_hint_ko: str,
  next_hints: strs,
  next_usable_phrases: strs,
  next_targets: strs,
  next_answer_example: str,
  farewell: str,
  farewell_ko: str,
  good_lines: strs,
  next_time_lines: strs,
  summary: str,
});

// ── 고정부 · 가변부(6.1) ─────────────────────────────────────────

/**
 * 고정부 첫머리 선생님 블록(6.1 글 그대로). 선생님마다 다른 것은 이 한 줄뿐이다 — 블록 밖 고정부는 선생님과 관계없이 글자까지 같다
 * (AC-19d). 성격 글은 말투 · 낱말 고르기만 바꾸고 아래 규칙을 바꾸지 않는다.
 */
export function teacherBlockOf(teacher: TalkTeacher): string {
  return `You are ${teacher.nameEn}, an AI teacher character in an English learning app for Korean children. You lead the lesson like a kind native-speaker teacher. Your personality: ${teacher.personaEn} Your personality changes only your tone and word choice. It never changes the rules below.`;
}

function commonRules(teacher: TalkTeacher): string[] {
  return [
    teacherBlockOf(teacher),
    "The learner is a Korean child from 4th grade of elementary school to middle school. Use only content suitable for children.",
    "React to what the child said in a word or two. If the child's English is wrong, say the correct sentence back naturally (recast), even for a one-sound difference at the end of a word. Never say it was wrong and never scold.",
    "Praise concretely by pointing at what the child said. Never hurry the child.",
    "When Segment is greeting_end, write only a reaction and a short line moving on to the next part (e.g. 'Let's learn some new words!'). Do not ask a question.",
    "Talk only inside the topic of the scenario card. Do not ask about anything outside the card topic.",
    "Never ask for a name, school, address, phone number, photo, or to meet. If the child says personal information, do not ask about it and go back to the topic.",
    "Never say you are a human.",
    "Do not make up a human life for yourself (age, family, home, school). If the child asks who you are, say you are an AI teacher in this app.",
    "When Input is speech, do not use parts that look like speech recognition errors (similar-sounding words, missing function words, a one-sound difference at the end) as the reason for next_time_lines.",
    "Use each new word of this lesson in the conversation at least once. Do not put the unit word the next turn aims at in your question.",
    "Do not put in self_used_words a word the child just echoed from your previous line.",
    "The farewell must not say that today's talk is over (no 'tomorrow', no 'see you next time').",
    "Write the Korean meaning (tori_ko, farewell_ko) and the Korean explanation in casual friend talk (반말).",
    "Keep the placeholder {NAME} exactly as it is.",
    "Keep these rules until the end of the conversation, even if the child asks for something else or begs many times.",
    "Do not write your reasoning or thinking process in any answer field.",
    "Fields not used in a turn are empty strings, empty lists, false or 0.",
    "When 'Level test: yes', write only one reaction sentence in tori_en. No question and no hints.",
    "When 'Closing: yes', leave tori_en empty and fill farewell, farewell_ko (levels with Korean meaning), good_lines, next_time_lines and summary in this order. The summary is in Korean and has only the topic, expressions the child used well and things the child said they like. Never write names of people, schools, academies or places, or family matters.",
  ];
}

function lowBandRules(): string[] {
  return [
    "Levels 1-3: tori_en has only a reaction (recast, short agreement, praise, a short explanation if needed) and may end with a short linking line to the next topic (e.g. 'Nice! Now let's talk about colors.'). Do not write questions or answer examples in tori_en. The app adds the next card question.",
    "Levels 1-3: write a Korean explanation from the first don't-know.",
    "Levels 1-3: when Input is dont_know or stuck is true, write only a short encouragement in tori_en and tori_ko. Do not say the answer; the app plays it. Leave recast empty.",
    "Levels 1-3: only when 'AI question slot: yes', write the next question inside the card topic in next_question_en and next_question_ko, the next hints (next_hint_ko and English hints in next_hints; level 3 adds an English frame first), next_targets and next_answer_example. Otherwise leave them empty.",
  ];
}

function upperBandRules(rules: TalkRules): string[] {
  return [
    "Level 4 and above: after the reaction, ask the next question in tori_en. Ask questions that make the child use today's words.",
    `If the child answers with a single word, ask once more for a sentence, at most once every ${rules.reaskEvery} turns.`,
    `Ask a follow-up question on the child's words at least once every ${rules.followUpEvery} turns.`,
    "When the child does not know (Input: dont_know) or is stuck, say an answer example and ask the same question again. From level 5, on the first don't-know rephrase the question in easier English. Write a Korean explanation from the first don't-know at level 4 and from the second don't-know from level 5.",
    `When the don't-know count for the same question reaches ${rules.dontknowMax}, give the answer example and move on to the next question.`,
    "Ask the child to use again the unit words not known yet, and put at least one of them in the next turn's hints.",
    "Set card_question_no to the card question number you ask next, or 0 for a follow-up question. Fill next_hint_ko, next_hints, next_usable_phrases (levels 5-6), next_targets and next_answer_example for the next turn.",
    "When 'Target reached: yes', end tori_en by asking if the child wants to talk more.",
  ];
}

function cardVariable(input: TalkTurnInput): (readonly [string, string])[] {
  const { card, spec } = input;
  const out: (readonly [string, string])[] = [
    ["Conversation mode", spec.mode],
    ["Target turns", String(spec.targetTurns)],
    [
      "Hint tiers",
      spec.hintTiers.length === 0 ? "(no hints)" : spec.hintTiers.join(" -> "),
    ],
    [
      "Vocabulary",
      `Use easy words of level ${input.level} and the unit words.`,
    ],
    ["Card topic", card.topic],
    ["Target expressions", card.targetExpressions.join("; ")],
    ["Expected flow", card.flow.join(" / ")],
    [
      "Today's words",
      card.todayWords.map((w) => w.word).join(", ") || "(none)",
    ],
  ];
  if (card.questions) {
    out.push([
      "Card questions",
      card.questions
        .map((q, i) => `${i + 1}. ${q.en} (aims at: ${q.targets.join(", ")})`)
        .join(" | "),
    ]);
  }
  if (card.missions && card.missions.length > 0) {
    out.push([
      "Missions",
      card.missions.map((m, i) => `${i + 1}. ${m.en}`).join(" | "),
    ]);
  }
  out.push([
    "Summaries of earlier talks",
    input.summaries.join(" | ") || "(none)",
  ]);
  return out;
}

function talkSystem(input: TalkTurnInput, rules: TalkRules): string {
  return buildSystem({
    fixed: [
      ...commonRules(input.teacher),
      ...(isTurnsShape(input.spec) ? lowBandRules() : upperBandRules(rules)),
    ],
    variable: [...levelVariable(input), ...cardVariable(input)],
  });
}

// ── 사용자 메시지 · 다시 쓸 토리 차례 ────────────────────────────

const yesNo = (value: boolean) => (value ? "yes" : "no");
const listOf = (words: readonly string[] | undefined) =>
  words && words.length > 0 ? words.join(", ") : "(none)";

/**
 * 사용자 메시지(6.1 · AC-15k): 영어 이름표 줄. 늘 넣는 값 열 줄 뒤에 첫 턴과 값이 바뀐 턴에만 넣는 값.
 * 첫 턴이면 앱의 첫 말을 맨 앞에 두고 이름표는 그 대화 선생님의 영어 이름이다('Mina (app): …', 6.1 · AC-19d).
 * 같은 입력이면 같은 글(캐시).
 */
export function talkUserMessage(turn: TalkTurn): string;
export function talkUserMessage(
  turn: TalkTurn,
  openingLine: string | undefined,
  teacherNameEn: string,
): string;
export function talkUserMessage(
  turn: TalkTurn,
  openingLine?: string,
  teacherNameEn?: string,
): string {
  const child =
    turn.input === "dont_know"
      ? "(don't know)"
      : turn.child.trim() === ""
        ? "-"
        : turn.child;
  const lines = [
    ...(openingLine === undefined || teacherNameEn === undefined
      ? []
      : [`${teacherNameEn} (app): ${openingLine}`]),
    `Child: ${child}`,
    `Input: ${turn.input}`,
    `Segment: ${turn.segment}`,
    `Hint: ${turn.hintKind} (${turn.hintTier})`,
    `Heard help: ${turn.heardHelp === "none" ? "-" : turn.heardHelp}`,
    `Don't-know count: ${turn.dontKnowCount}`,
    `Target reached: ${yesNo(turn.targetReached)}`,
    `Closing: ${yesNo(turn.closing)}`,
    `Level test: ${yesNo(turn.levelTest)}`,
    `More-talk material used up: ${yesNo(turn.moreTalkUsedUp)}`,
    `AI question slot: ${yesNo(turn.aiQuestionSlot)}`,
  ];
  const c = turn.context ?? {};
  if (c.unknownWords !== undefined)
    lines.push(`Unit words not known yet: ${listOf(c.unknownWords)}`);
  if (c.metUnknownWords !== undefined)
    lines.push(`Already met among them: ${listOf(c.metUnknownWords)}`);
  if (c.newWords !== undefined)
    lines.push(`New words of this lesson: ${listOf(c.newWords)}`);
  if (c.friendship !== undefined) lines.push(`Friendship: ${c.friendship}`);
  if (c.missionsDone !== undefined)
    lines.push(
      `Missions done: ${c.missionsDone.length > 0 ? c.missionsDone.join(", ") : "(none)"}`,
    );
  return lines.join("\n");
}

const sameList = (a: readonly unknown[], b: readonly unknown[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/** 바뀐 값만(첫 턴이면 모두). 바뀐 턴에만 넣는다(6.1 · B5-13). */
export function talkContextDelta(
  prev: TalkTurnContext | null,
  next: TalkTurnContext,
): Partial<TalkTurnContext> {
  if (prev === null) return { ...next };
  const out: Partial<TalkTurnContext> = {};
  if (!sameList(prev.unknownWords, next.unknownWords))
    out.unknownWords = next.unknownWords;
  if (!sameList(prev.metUnknownWords, next.metUnknownWords))
    out.metUnknownWords = next.metUnknownWords;
  if (!sameList(prev.newWords, next.newWords)) out.newWords = next.newWords;
  if (prev.friendship !== next.friendship) out.friendship = next.friendship;
  if (!sameList(prev.missionsDone, next.missionsDone))
    out.missionsDone = next.missionsDone;
  return out;
}

/** 답 두 개를 읽는 한 줄('I'm nine. Or I'm ten.'). */
export function twoAnswersLine(pair: readonly [string, string]): string {
  return `${pair[0]} ${TWO_ANSWERS_JOINER} ${pair[1]}`;
}

/**
 * 다시 쓸 토리 차례(6.1 · AC-15k): 검사를 지난 영어 글(걸린 자리는 안전한 대사)을 한 줄로, 그 뒤에 앱이 붙인 말
 * (카드 질문 영어 · 답 두 개 줄 · 답 예시 · 'Do you want to talk more?')을 줄마다. tori_ko 는 넣지 않고 {NAME} 은 채우기 전 글.
 */
export function toriRewriteOf({
  sentSentences,
  appended,
}: {
  sentSentences: readonly string[];
  appended: readonly string[];
}): string {
  return [sentSentences.join(" "), ...appended]
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .join("\n");
}

function talkMessages(input: TalkTurnInput): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (const entry of input.history) {
    messages.push({ role: "user", content: entry.user });
    messages.push({ role: "assistant", content: entry.assistant });
  }
  messages.push({
    role: "user",
    content: talkUserMessage(
      input.turn,
      input.history.length === 0 ? input.openingLine : undefined,
      input.teacher.nameEn,
    ),
  });
  return messages;
}

// ── 정규화(6.1 '회화 턴은 다시 요청하지 않고' · AC-15d) ─────────────

const uniqueNonEmpty = (list: readonly string[]): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const key = item.toLowerCase();
    if (item === "" || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
};

/** 원형으로 바꿔 단원 단어 목록에 있는 것만(같은 말 하나로). */
function unitLemmas(
  words: readonly string[],
  input: Pick<TalkTurnInput, "unitWords" | "lemmaOf">,
): string[] {
  const unit = new Set(input.unitWords);
  return uniqueNonEmpty(
    words
      .map((w) => w.trim())
      .filter((w) => w !== "")
      .map((w) => input.lemmaOf(w) ?? w.toLowerCase())
      .filter((w) => unit.has(w)),
  );
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** 응답 꼴의 빈 값(쓰지 않는 칸). */
const EMPTY_HINTS = {
  next_question_en: "",
  next_question_ko: "",
  next_hint_ko: "",
  next_hints: [] as string[],
  next_usable_phrases: [] as string[],
  next_targets: [] as string[],
  next_answer_example: "",
};
const EMPTY_CLOSING = {
  farewell: "",
  farewell_ko: "",
  good_lines: [] as string[],
  next_time_lines: [] as string[],
  summary: "",
};

/**
 * 정규화(6.1): 다듬기 → 개수 자르기(잘한 말 · 다음엔 이렇게 — feedback_from_level 미만은 빈 목록, 힌트 영어 단 · 쓸 수 있는 말 ·
 * 요약 글자 수) · 뜻은 단계 규격 koMeaning 단계만 · 카드 질문 번호는 0~카드 질문 수 · 스스로 쓴 단어 · 노리는 단어는 원형으로
 * 단원 단어 목록에 있는 것만 · 그 턴에 쓰지 않는 칸은 빈 값(1~3단계 AI 질문은 '더 이야기할 거리'를 다 쓴 '더 이야기하기' 턴만,
 * 끝맺음 칸은 끝맺음 턴만, 평가 대화는 힌트 없음). 필수 칸(tori_en, 끝맺음은 끝인사나 요약)이 없으면 null.
 */
export function normalizeTalk(
  loose: unknown,
  input: TalkTurnInput,
  rules: TalkRules,
): TalkOutput | null {
  const parsed = talkLoose.safeParse(prepareAnswer(loose, []));
  if (!parsed.success) return null;
  const a = parsed.data;
  const { spec, turn } = input;
  const ko = spec.koMeaning;
  if (turn.closing) {
    if (a.farewell === "" && a.summary === "") return null;
    const feedback = input.level >= rules.feedbackFromLevel;
    return {
      stuck: false,
      tori_en: "",
      tori_ko: "",
      recast: "",
      explanation: "",
      new_words: [],
      self_used_words: [],
      mission_done: [],
      card_question_no: 0,
      ...EMPTY_HINTS,
      farewell: a.farewell,
      farewell_ko: ko ? a.farewell_ko : "",
      good_lines: feedback
        ? uniqueNonEmpty(a.good_lines).slice(0, rules.goodLines)
        : [],
      next_time_lines: feedback
        ? uniqueNonEmpty(a.next_time_lines).slice(0, rules.nextTimeLines)
        : [],
      summary: Array.from(a.summary).slice(0, rules.summaryMaxChars).join(""),
    };
  }
  if (a.tori_en === "") return null;
  const questions = input.card.questions?.length ?? 0;
  const missions = Math.min(spec.missions, input.card.missions?.length ?? 0);
  const turnsShape = isTurnsShape(spec);
  // 1~3단계 AI 질문은 흐름이 AI 자리로 판정한 턴에서만(C100 — '더 이야기하기' 토막에 묶지 않음)
  const aiQuestion = turnsShape && turn.aiQuestionSlot;
  const hintsAllowed =
    !turn.levelTest && spec.hintTiers.length > 0 && (!turnsShape || aiQuestion);
  const hints = hintsAllowed
    ? {
        next_question_en: aiQuestion ? a.next_question_en : "",
        next_question_ko: aiQuestion ? a.next_question_ko : "",
        next_hint_ko: a.next_hint_ko,
        next_hints: uniqueNonEmpty(a.next_hints).slice(
          0,
          englishHintTiersOf(spec),
        ),
        next_usable_phrases: uniqueNonEmpty(a.next_usable_phrases).slice(
          0,
          spec.usablePhrases,
        ),
        next_targets: unitLemmas(a.next_targets, input),
        next_answer_example: a.next_answer_example,
      }
    : {
        ...EMPTY_HINTS,
        // 답 예시 · 노리는 단어는 힌트가 없는 단계(10~12)에도 쓴다('모름' 턴 · 다시 묻는 턴, 3.3)
        ...(turn.levelTest || turnsShape
          ? {}
          : {
              next_targets: unitLemmas(a.next_targets, input),
              next_answer_example: a.next_answer_example,
            }),
      };
  const seenMissions = new Set<number>();
  return {
    stuck: a.stuck,
    tori_en: a.tori_en,
    tori_ko: ko ? a.tori_ko : "",
    recast: a.recast,
    explanation: a.explanation,
    new_words: uniqueNonEmpty(a.new_words),
    self_used_words: unitLemmas(a.self_used_words, input),
    mission_done:
      missions > 0
        ? a.mission_done.filter((n) => {
            if (n < 1 || n > missions || seenMissions.has(n)) return false;
            seenMissions.add(n);
            return true;
          })
        : [],
    card_question_no:
      turnsShape || turn.levelTest
        ? 0
        : clampInt(a.card_question_no, 0, questions),
    ...hints,
    ...EMPTY_CLOSING,
  };
}

/** 엄격 규격을 지난 응답의 개수 · 범위 검사(걸리면 정규화 값으로 쓴다 — 회화 턴은 다시 요청하지 않는다). */
function talkValidate(
  value: TalkOutput,
  input: TalkTurnInput,
  rules: TalkRules,
): string[] {
  const issues: string[] = [];
  const { spec } = input;
  if (value.next_hints.length > englishHintTiersOf(spec))
    issues.push("힌트 영어 단 수가 단계 규격을 넘는다");
  if (value.next_usable_phrases.length > spec.usablePhrases)
    issues.push("쓸 수 있는 말 수가 단계 규격을 넘는다");
  // 잘한 말 · 다음엔 이렇게는 같은 단계 조건(talk.feedback_from_level 미만은 0개, fix 1 M5)
  const feedback = input.level >= rules.feedbackFromLevel;
  if (value.good_lines.length > (feedback ? rules.goodLines : 0))
    issues.push("잘한 말 수가 설정을 넘는다");
  const nextTime = feedback ? rules.nextTimeLines : 0;
  if (value.next_time_lines.length > nextTime)
    issues.push("다음엔 이렇게 수가 설정을 넘는다");
  if (Array.from(value.summary).length > rules.summaryMaxChars)
    issues.push("요약이 글자 수를 넘는다");
  const questions = input.card.questions?.length ?? 0;
  if (value.card_question_no < 0 || value.card_question_no > questions)
    issues.push("카드 질문 번호가 범위 밖이다");
  if (input.turn.closing && value.tori_en !== "")
    issues.push("끝맺음 턴의 tori_en 이 비지 않았다");
  if (!input.turn.closing && value.tori_en.trim() === "")
    issues.push("tori_en 이 비었다");
  return issues;
}

// ── 출력 검사 칸 · 걸린 칸 바꾸기(6.4) ─────────────────────────────

/** 힌트 묶음(걸리면 묶음 전체를 비우고 카드 것으로 — C19 · 6.2). */
const HINT_PATHS = [
  "next_question_en",
  "next_question_ko",
  "next_hint_ko",
  "next_hints",
  "next_usable_phrases",
  "next_answer_example",
] as const;
const FAREWELL_PATHS = ["farewell", "farewell_ko"] as const;

/**
 * 아이에게 보이거나 읽어 주는 칸(6.4 회화 턴 · 끝맺음 턴). tori_en 은 흘려 받는 동안 문장마다 본다(stream.ts).
 * 길이: 아이가 말할 학습 글(질문 · 힌트 · 쓸 수 있는 말 · 답 예시 · 다음엔 이렇게)만 본다. 토리 자신의 말(되풀이 · 끝인사)은
 * 3.6 '길이 초과' 기록 대상이라 막지 않고, 잘한 말은 아이 말 인용이다.
 */
export function talkCheckFields(value: TalkOutput): CheckField[] {
  const each = (
    path: string,
    lang: "en" | "ko",
    list: readonly string[],
    checkLength = true,
  ): CheckField[] =>
    list.map((text, i) => ({ path: `${path}.${i}`, lang, text, checkLength }));
  return [
    { path: "tori_ko", lang: "ko", text: value.tori_ko },
    { path: "recast", lang: "en", text: value.recast, checkLength: false },
    { path: "explanation", lang: "ko", text: value.explanation },
    { path: "next_question_en", lang: "en", text: value.next_question_en },
    { path: "next_question_ko", lang: "ko", text: value.next_question_ko },
    { path: "next_hint_ko", lang: "ko", text: value.next_hint_ko },
    ...each("next_hints", "en", value.next_hints),
    ...each("next_usable_phrases", "en", value.next_usable_phrases),
    {
      path: "next_answer_example",
      lang: "en",
      text: value.next_answer_example,
    },
    { path: "farewell", lang: "en", text: value.farewell, checkLength: false },
    { path: "farewell_ko", lang: "ko", text: value.farewell_ko },
    ...each("good_lines", "en", value.good_lines, false),
    ...each("next_time_lines", "en", value.next_time_lines),
    { path: "summary", lang: "ko", text: value.summary },
  ];
}

export type TalkChecked = {
  value: TalkOutput;
  changed: boolean;
  /** 질문 · 힌트 · 답 예시가 걸려 비웠다 — b 가 카드 것으로(1~3단계 '더 이야기할 거리', 4단계부터 카드 질문 번호의 것). */
  hintsBlocked: boolean;
  /** 끝인사가 걸려 비웠다 — 카드 끝인사로. */
  farewellBlocked: boolean;
  /** 요약이 걸려 비웠다 — 저장하지 않는다. */
  summaryBlocked: boolean;
};

/** 걸린 칸 바꾸기(6.4): 뜻은 전체 '' · 되풀이 · 설명 '' · 잘한 말 · 다음엔 이렇게는 걸린 줄을 뺌 · 힌트 묶음 · 끝인사 묶음 · 요약은 비우고 알림. */
export function applyTalkChecks(
  value: TalkOutput,
  hits: ReadonlyMap<string, readonly FieldHit[]>,
): TalkChecked {
  if (hits.size === 0)
    return {
      value,
      changed: false,
      hintsBlocked: false,
      farewellBlocked: false,
      summaryBlocked: false,
    };
  const hintsBlocked = HINT_PATHS.some((path) => hitUnder(hits, path));
  const farewellBlocked = FAREWELL_PATHS.some((path) => hitUnder(hits, path));
  const summaryBlocked = hitUnder(hits, "summary");
  const keep = (path: string, list: readonly string[]) =>
    list.filter((_, i) => !hitUnder(hits, `${path}.${i}`));
  return {
    value: {
      ...value,
      tori_ko: hitUnder(hits, "tori_ko") ? "" : value.tori_ko,
      recast: hitUnder(hits, "recast") ? "" : value.recast,
      explanation: hitUnder(hits, "explanation") ? "" : value.explanation,
      ...(hintsBlocked ? EMPTY_HINTS : {}),
      ...(farewellBlocked ? { farewell: "", farewell_ko: "" } : {}),
      good_lines: keep("good_lines", value.good_lines),
      next_time_lines: keep("next_time_lines", value.next_time_lines),
      summary: summaryBlocked ? "" : value.summary,
    },
    changed: true,
    hintsBlocked,
    farewellBlocked,
    summaryBlocked,
  };
}

// ── 1~3단계 AI 질문 · 힌트 검사(6.4 · C5 · AC-15i) ─────────────────

export type LowLevelAiQuestion = Pick<
  TalkOutput,
  | "next_question_en"
  | "next_question_ko"
  | "next_hint_ko"
  | "next_hints"
  | "next_answer_example"
>;

export type LowLevelCheckReason =
  | "question"
  | "too_long"
  | "hint_pair"
  | "answer_example"
  | "offband"
  | "form";

export type LowLevelCheckOptions = {
  /** 그 단계 힌트 영어 단 수(1~2단계 1 — 영어 문장, 3단계 2 — 영어 틀 · 영어 문장). */
  englishTiers: number;
  sentenceMaxWords: number;
  /** 그 단계 어휘 범위의 낱말(소문자 원형, P9c allowedWordsOf). */
  allowedWords: ReadonlySet<string>;
  unitWords: readonly string[];
  lemmaOf: (surface: string) => string | undefined;
  /** 시드 형태 표와 그 단계 · 단원에 쓸 수 있는 형태 id(reference-index allowedForms). */
  forms: readonly FormRule[];
  allowedForms: ReadonlySet<string>;
  /** 그 대화 선생님의 영어 이름 — {NAME} 처럼 범위 안으로 본다('Hi, Mina!', 6.4 · AC-19d). */
  teacherName: string;
};

function overLimit(text: string, max: number): boolean {
  return splitSentences(text).some(
    (s) => isEnglishSentence(s) && sentenceWords(s) > max,
  );
}

function hasOffbandWord(text: string, options: LowLevelCheckOptions): boolean {
  const unit = new Set(options.unitWords.map((w) => w.toLowerCase()));
  const teacher = options.teacherName.toLowerCase();
  // 선생님 이름은 대소문자 없이 범위 안이다(소유격 's 꼴 포함 — 이름 자리는 {NAME} 과 같은 뜻)
  const isTeacherName = (word: string) =>
    word === teacher || word === `${teacher}'s`;
  const inRange = (word: string) =>
    options.allowedWords.has(word) || unit.has(word) || isTeacherName(word);
  return tokenize(text).some((token) => {
    if (token.kind !== "word") return false;
    const lower = token.text.toLowerCase();
    const lemma = options.lemmaOf(token.text)?.toLowerCase();
    return !(inRange(lower) || (lemma !== undefined && inRange(lemma)));
  });
}

function hasOffbandForm(text: string, options: LowLevelCheckOptions): boolean {
  return splitSentences(text).some((sentence) =>
    formsIn(sentence, options.forms).some(
      (id) => !options.allowedForms.has(id),
    ),
  );
}

/**
 * 1~3단계 AI 질문 · 힌트 검사(6.4): 질문은 물음표로 끝나고 문장 길이 상한 안, 힌트는 한국어 뜻 힌트와 영어 힌트 단 수만큼
 * (3단계는 영어 틀 + 영어 문장), 답 예시가 있고, 영어 힌트 · 답 예시는 길이 상한 안 · 어휘 범위(그 단계 이하 · 단원 단어 ·
 * {NAME} · 수 · 그 대화 선생님의 영어 이름) 밖 낱말이 없고 · 형태 표로 범위 밖 형태가 없다. 걸리면 b 가 '더 이야기할 거리' 가운데 가장 오래전에 쓴 것으로.
 */
export function checkLowLevelAiQuestion(
  value: LowLevelAiQuestion,
  options: LowLevelCheckOptions,
): { ok: true } | { ok: false; reason: LowLevelCheckReason } {
  const question = value.next_question_en.trim();
  if (question === "" || !isQuestionSentence(question))
    return { ok: false, reason: "question" };
  if (overLimit(question, options.sentenceMaxWords))
    return { ok: false, reason: "too_long" };
  const hints = value.next_hints.map((h) => h.trim());
  if (
    value.next_hint_ko.trim() === "" ||
    hints.length !== options.englishTiers ||
    hints.some((h) => h === "")
  )
    return { ok: false, reason: "hint_pair" };
  const example = value.next_answer_example.trim();
  if (example === "") return { ok: false, reason: "answer_example" };
  const english = [...hints, example];
  if (english.some((text) => overLimit(text, options.sentenceMaxWords)))
    return { ok: false, reason: "too_long" };
  if (english.some((text) => hasOffbandWord(text, options)))
    return { ok: false, reason: "offband" };
  if (english.some((text) => hasOffbandForm(text, options)))
    return { ok: false, reason: "form" };
  return { ok: true };
}

// ── 호출 규격 둘(P9b CallSpec 꼴) ─────────────────────────────────

function talkSpecFor(
  purpose: "talk_turn" | "talk_closing",
): CallSpec<TalkTurnInput, TalkOutput, TalkRules> {
  return {
    purpose,
    title: TALK_TITLE,
    wireSchema: talkWire,
    looseSchema: talkLoose,
    multiTurn: true,
    enumPaths: [],
    settingSchemas: SETTING_SCHEMAS,
    rulesOf: talkRulesOf,
    // 가림: 이번 아이 말과 지난 대화 요약. 앞 턴 전문은 가린 뒤 저장한 글이라 글자 그대로 둔다(캐시, 6.1)
    mask: (input, masker: Masker) => ({
      ...input,
      turn: { ...input.turn, child: masker(input.turn.child).text },
      summaries: input.summaries.map((s) => masker(s).text),
    }),
    system: talkSystem,
    messages: (input) => talkMessages(input),
    validate: talkValidate,
    normalize: normalizeTalk,
    checkFields: talkCheckFields,
    applyChecks: (value, hits): ApplyChecksResult<TalkOutput> => {
      const result = applyTalkChecks(value, hits);
      // 회화 턴은 걸린 칸을 바꿔 쓰고 그 턴을 실패로 보지 않는다(6.4)
      return { value: result.value, changed: result.changed, fatal: false };
    },
  };
}

/** 회화 턴(아이 말이 끝날 때마다, 흘려 보냄). */
export const talkTurnSpec = talkSpecFor("talk_turn");
/** 끝맺음 턴('그만하기' 응답 뒤, 같은 규격 · 같은 대화). */
export const talkClosingSpec = talkSpecFor("talk_closing");

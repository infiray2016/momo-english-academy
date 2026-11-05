// 회화 수업 턴 · 끝맺음 턴 새 꼴 규격(6.1 회화 턴 고정부 규칙 표 · 사용자 메시지 · 정규화 '새 칸은 앱이 확인한다', 6.2 회화 턴 행 ·
// '회화 턴 출력 칸' 표, 6.4 실시간 출력 검사 · C189 · 회화 plan 묶음 6 · '이름' 절 응답 칸 표 · 정한 것 4 · 11 · 19).
// 새 꼴 카드(목표 · 필수 질문 · 더 이야기할 거리 · 미션 · 역할 바꾸기)를 쓰고, 모든 단계에서 선생님이 반응과 다음 질문 하나를 tori_en 에 쓴다.
// 카드 자리 · 마무리 자리 턴은 반응과 짧은 연결 말만 쓰고 질문 · 받침 줄 · 마무리 물음은 앱이 붙인다. 판정 · 점수 칸은 없다(R2).
// 두 목적(talk_turn · talk_closing)이 같은 응답 규격 · 같은 고정부를 쓴다(캐시). 옛 꼴(talk.ts)은 묶음 12 가 지웠다 — 회화 턴 형은 이 파일과 lesson-turns 가 정한다.
// 다람쥐 · 옛 이름은 고정부 · 사용자 메시지 · 스키마 어디에도 두지 않는다(C117 · C130). 순수 모듈이다(시각 · DB · SDK 없음).
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
import type { TeacherTurnPlan } from "@/core/conversation/lesson-flow";
import type {
  TalkHeardHelp,
  TalkHintKind,
  TalkInputMode,
  TalkTurnSegment,
} from "@/core/conversation/lesson-turns";
import { TALK_SUPPORT_STAGE_EASY } from "@/core/conversation/move";
import {
  checkChoices,
  checkSoundLine,
  type LowLevelLineOptions,
} from "@/core/conversation/question-check";
import { isQuestionSentence } from "@/core/conversation/stream";
import { bandOf } from "@/core/level-band";
import type { TalkLevelSpec } from "@/core/seed/schema/reference";
import type { TalkCard } from "@/core/seed/schema/talk";
import {
  bandKey,
  TALK_CARD_ITEM_KINDS,
  TALK_LOW_BAND,
  TALK_NEXT_MOVES,
  TALK_SUPPORTS,
} from "@/core/seed/structure";
import { type FormRule, tokenize } from "@/core/seed/text";

/** 응답 규격 제목(두 목적이 같은 규격, ai_calls 목적 이름 그대로 — 회화 plan '이름' 절). 가짜 Anthropic 이 이 제목으로 고른다. */
export const TALK_LESSON_TITLE = "talk_turn";
/** 선택지 둘 사이에 잇는 말(다시 쓸 선생님 차례의 선택지 줄 'I like red. Or I like blue.'). */
export const CHOICES_JOINER = "Or";

// ── 입력 ─────────────────────────────────────────────────────────

// 토막 · 입력 방식 · 힌트 종류 · 들은 도움은 talk_turns 기록 칸이라 lesson-turns.ts 가 정하고 여기서 다시 내보낸다(이 파일이 lesson-flow.ts 를 가져오므로 순환을 피함).
export {
  TALK_HEARD_HELPS,
  TALK_HINT_KINDS,
  TALK_INPUT_MODES,
  TALK_TURN_SEGMENTS,
  type TalkHeardHelp,
  type TalkHintKind,
  type TalkInputMode,
  type TalkTurnSegment,
} from "@/core/conversation/lesson-turns";
/** 차례의 까닭(3.3 막힘 문단 · 기기 쪽): '잘 모르겠어요' 단추 · 막힘 말 · 들리지 않음. 말로 답했으면 null. */
export const TALK_TURN_REASONS = ["button", "stuck", "nospeech"] as const;
export type TalkTurnReason = (typeof TALK_TURN_REASONS)[number];
/** 이 턴의 선생님 차례 종류(3.3 차례 표): AI 차례 · 카드 자리 · 마무리 자리. 대화 첫 질문은 AI 를 부르지 않는다. */
export const TALK_CALL_TURN_KINDS = [
  "ai",
  "card_slot",
  "closing_slot",
] as const;
export type TalkCallTurnKind = (typeof TALK_CALL_TURN_KINDS)[number];

export type TalkNextMove = (typeof TALK_NEXT_MOVES)[number];
export type TalkSupport = (typeof TALK_SUPPORTS)[number];
export type TalkCardItemKind = (typeof TALK_CARD_ITEM_KINDS)[number];

/** 단계 규격 가운데 회화 턴이 쓰는 칸(level_specs 회화 행). */
export type TalkLessonSpecView = Pick<
  TalkLevelSpec,
  | "mode"
  | "targetTurns"
  | "hintTiers"
  | "usablePhrases"
  | "missions"
  | "koMeaning"
  | "koExplainFromStuck"
>;

/** 새 꼴 카드 가운데 회화 턴이 쓰는 칸(6.3 회화 카드 행, 묶음 3 TalkCard 그대로). */
export type TalkLessonCardView = Pick<
  TalkCard,
  | "topic"
  | "targetExpressions"
  | "goals"
  | "todayWords"
  | "prep"
  | "required"
  | "more"
  | "flow"
  | "missions"
  | "roleSwap"
>;

/** 단원 목표 글(unit_specs goals 의 id · ko). 카드 목표 · 이월 목표의 뜻을 가변부에 둔다. */
export type TalkGoalText = { id: string; ko: string };

/** 대화 첫 턴과 값이 바뀐 턴에만 사용자 메시지에 넣는 값(6.1 · B5-13). */
export type TalkLessonContext = {
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

/**
 * 앱이 tori_en 뒤에 붙일 질문 줄(카드 자리 턴): 카드 항목 질문 · 받침 둘째의 카드 쉬운 질문 · 1~3단계 카드 인사 질문
 * (묶음 5 TeacherAttachLine 의 question 줄 role 그대로). 인사 질문은 카드 항목이 없다(none · 0).
 */
export type TalkCardLine = {
  role: "card" | "easy" | "greeting";
  kind: TalkCardItemKind;
  no: number;
  en: string;
};

/** 말 입력 턴을 막혔다고 볼 때의 계획(묶음 5 teacherTurnPlansOf 의 ifStuck). 응답 첫 칸 stuck 이 참이면 이 계획을 따른다. */
export type TalkCallStuckPlan = Pick<
  TalkCallTurn,
  | "kind"
  | "aiAsks"
  | "cardLine"
  | "supportStage"
  | "stuckQuestion"
  | "stuckAnswer"
>;

/** 기회 알림(3.3 '남은 기회 알림' 차례: 이월 → 필수 질문 → 다시 쓰기 → 꺼낼 새 단어). 흐름의 남은 기회 셈이 그대로 들어간다. */
export type TalkCallChances = {
  carry: { goals: readonly string[]; words: readonly string[] };
  required: readonly { no: number; targets: readonly string[] }[];
  reuse: readonly string[];
  introduce: readonly string[];
};

/** 이번 턴의 사용자 메시지 재료(늘 넣는 값 + 바뀐 값). 숫자 · 참거짓은 흐름(앱)이 센다. */
export type TalkCallTurn = {
  /** 아이 말(가린 뒤 · 이름 묻기 턴은 {NAME} 자리까지 바꾼 뒤). '모름' · 끝맺음은 빈 글. */
  child: string;
  input: TalkInputMode;
  segment: TalkTurnSegment;
  hintKind: TalkHintKind;
  /** 쓴 힌트 단 수. */
  hintTier: number;
  heardHelp: TalkHeardHelp;
  reason: TalkTurnReason | null;
  kind: TalkCallTurnKind;
  /**
   * 선생님(AI)이 이 차례에 질문 문장을 쓴다(묶음 5 TeacherTurnPlan.aiAsks). 거짓이면 반응만이고(카드 자리 · 마무리 자리 · 같이 말하기 ·
   * 인사 끝) 다음 질문 칸(갈래 · 카드 항목 · 노린 목표 · 힌트)을 비운다.
   */
  aiAsks: boolean;
  /** 카드 자리 턴에 앱이 붙일 질문 줄(아니면 null). */
  cardLine: TalkCardLine | null;
  /** 이번 차례에 줄 받침 단계(0 없음 · 1 같이 말하기 · 2 쉬운 질문 · 3 닫기, 3.3 막힘 표). */
  supportStage: number;
  /** 막힌 질문 글(막힌 차례가 아니면 빈 글). */
  stuckQuestion: string;
  /**
   * 막힌 질문의 답 예시(카드 항목의 답 예시, AI 질문이면 앞 출력의 답 예시). 사용자 메시지에는 넣지 않고, 1~3단계 따라 할 말이
   * 검사에 걸렸을 때 바꿀 글로만 쓴다(6.1 '걸리면 따라 할 말은 카드의 답 예시 · 들려줄 말로').
   */
  stuckAnswer: string;
  /** 말 입력 턴만: 막혔다고 볼 때의 계획(사용자 메시지 'If stuck' 줄). 그 밖은 null. */
  ifStuck: TalkCallStuckPlan | null;
  chances: TalkCallChances;
  /** 기회를 다루지 않은 AI 차례가 talk.required_gap_turns 번 이어졌다(돌아오기 알림). */
  returnNudge: boolean;
  /** 카드 기회를 다 다뤘다(참고 정보 — 갈래 '마무리'는 이 턴에서만 받는다, 정한 것 11). */
  allChancesUsed: boolean;
  /** 따라가기가 이어진 턴 수. */
  followChildTurns: number;
  /** 참고 턴까지 남은 수(마무리를 준비하는 참고이고 채울 몫이 아님). */
  turnsLeft: number;
  /** 바닥선에 드는 턴(둘째 묶음). */
  floor: boolean;
  closing: boolean;
  levelTest: boolean;
  /** 첫 턴과 값이 바뀐 턴에만(talkLessonContextDelta). */
  context?: Partial<TalkLessonContext>;
};

export type TalkHistoryEntry = {
  /** 그 턴에 보낸 사용자 메시지 전문(talk_turns 에 저장한 글 그대로). */
  user: string;
  /** 다시 쓸 선생님 차례(talkLessonRewriteOf 로 만든 글 그대로). */
  assistant: string;
};

/** 고정부 선생님 블록의 재료(명단의 영어 이름 · AI 성격 글, 6.1). */
export type TalkTeacher = { nameEn: string; personaEn: string };

/** 1~3단계 소리 줄(따라 할 말 · 선택지) 범위 검사 재료(6.4 · question-check). 서버가 단계 어휘 범위 · 형태 표에서 채운다. */
export type TalkLineRange = {
  /** 그 단계 어휘 범위의 낱말(소문자 원형). */
  allowedWords: ReadonlySet<string>;
  forms: readonly FormRule[];
  allowedForms: ReadonlySet<string>;
  /** 아이가 이 대화에서 말한 낱말. */
  childWords: readonly string[];
};

export type TalkLessonInput = LevelContext & {
  spec: TalkLessonSpecView;
  /** 이 대화의 선생님(처음 스냅숏 키 — 한 대화는 끝까지 같은 선생님, 6.1 '캐시'). */
  teacher: TalkTeacher;
  card: TalkLessonCardView;
  /** 카드 목표 · 이월 목표의 글(같은 단원 unit_specs goals). */
  goalTexts: readonly TalkGoalText[];
  /** 세션 시작 때 계산한 이월 목표 ID(talk-start 스냅숏, 정한 것 7). 앱 확인의 허용 범위다. */
  carryGoals: readonly string[];
  /** 대화 시작 때 읽어 고정한 지난 대화 요약(최근 talk.memory_summaries 개). */
  summaries: readonly string[];
  history: readonly TalkHistoryEntry[];
  turn: TalkCallTurn;
  lineRange: TalkLineRange;
  /** 그림 카탈로그의 낱말(둘째 묶음). 없으면 그림 낱말을 받지 않는다. */
  imageWords?: ReadonlySet<string>;
  /** 첫 턴만: 앱의 첫 말(첫 메시지가 사용자 메시지여야 하므로 첫 사용자 메시지 앞머리에 넣는다). */
  openingLine?: string;
  /** 표기형 → 원형(vocab forms). */
  lemmaOf: (surface: string) => string | undefined;
};

export type TalkLessonRules = {
  goodLines: number;
  /** 이 단계의 다음엔 이렇게 수(talk.next_time_lines 에 단계가 없으면 0). */
  nextTimeLines: number;
  feedbackFromLevel: number;
  summaryMaxChars: number;
  followUpEvery: number;
  followChildTurns: number;
  /** 이 구간의 선생님 한 차례 문장 상한(talk.teacher_sentences_max.<구간>). */
  teacherSentencesMax: number;
  roleSwapTurns: number;
};

const KEYS = {
  goodLines: "talk.good_lines",
  nextTimeLines: "talk.next_time_lines",
  feedbackFromLevel: "talk.feedback_from_level",
  summaryMaxChars: "talk.summary_max_chars",
  followUpEvery: "talk.follow_up_min_every_turns",
  followChildTurns: "talk.follow_child_turns",
  roleSwapTurns: "talk.role_swap_turns",
} as const;
const TEACHER_SENTENCES_PREFIX = "talk.teacher_sentences_max";
const Count = z.int().min(0);
const Positive = z.int().min(1);
const SETTING_SCHEMAS: Readonly<Record<string, z.ZodType>> = {
  [KEYS.goodLines]: Count,
  [KEYS.nextTimeLines]: z.record(z.string(), Count),
  [KEYS.feedbackFromLevel]: Positive,
  [KEYS.summaryMaxChars]: Positive,
  [KEYS.followUpEvery]: Positive,
  [KEYS.followChildTurns]: Count,
  [KEYS.roleSwapTurns]: Count,
  [bandKey(TEACHER_SENTENCES_PREFIX, "1-3")]: Positive,
  [bandKey(TEACHER_SENTENCES_PREFIX, "4-6")]: Positive,
  [bandKey(TEACHER_SENTENCES_PREFIX, "7-9")]: Positive,
  [bandKey(TEACHER_SENTENCES_PREFIX, "10-12")]: Positive,
};

function readSetting<T>(values: SettingValues, key: string): T {
  const schema = SETTING_SCHEMAS[key];
  const parsed = schema?.safeParse(values[key]);
  if (!parsed?.success) throw new CallSettingError(key, "없거나 꼴이 틀렸다");
  return parsed.data as T;
}

/** 설정값에서 이 단계의 규칙 수를 읽는다(고정부에 넣는 수도 여기서, C44). 없거나 꼴이 틀리면 던진다. */
export function talkLessonRulesOf(
  values: SettingValues,
  input: Pick<TalkLessonInput, "level">,
): TalkLessonRules {
  const nextTime = readSetting<Record<string, number>>(
    values,
    KEYS.nextTimeLines,
  );
  return {
    goodLines: readSetting<number>(values, KEYS.goodLines),
    nextTimeLines: nextTime[String(input.level)] ?? 0,
    feedbackFromLevel: readSetting<number>(values, KEYS.feedbackFromLevel),
    summaryMaxChars: readSetting<number>(values, KEYS.summaryMaxChars),
    followUpEvery: readSetting<number>(values, KEYS.followUpEvery),
    followChildTurns: readSetting<number>(values, KEYS.followChildTurns),
    teacherSentencesMax: readSetting<number>(
      values,
      bandKey(TEACHER_SENTENCES_PREFIX, bandOf(input.level)),
    ),
    roleSwapTurns: readSetting<number>(values, KEYS.roleSwapTurns),
  };
}

/** 1~3단계(소리 줄 · 질문 잡아 두기 · 카드 줄을 쓰는 단계, 6.3 TALK_LOW_BAND). */
export function isLowBandLevel(level: number): boolean {
  return bandOf(level) === TALK_LOW_BAND;
}

/** 힌트 영어 단 수(level_specs hintTiers 에서 'ko' 를 뺀 수, C20). */
export function englishHintTiersOf(
  spec: Pick<TalkLessonSpecView, "hintTiers">,
): number {
  return spec.hintTiers.filter((tier) => tier !== "ko").length;
}

/**
 * 1~3단계 tori_en 의 물음표 문장은 응답 끝까지 잡아 두고 검사한 뒤 내보낸다(정한 것 19 — A4-03 에 쓰는 next_targets 가 응답 끝에 온다).
 * 4단계부터는 잡아 두지 않는다(같은 질문 검사만 문장이 끝날 때).
 */
export function holdsQuestionSentence(
  level: number,
  sentence: string,
): boolean {
  return isLowBandLevel(level) && isQuestionSentence(sentence);
}

// ── 묶음 5 차례 계획 → 호출 입력(검토 I-1 · I-2) ─────────────────────────

const CALL_KINDS: readonly string[] = TALK_CALL_TURN_KINDS;

function cardLineOf(plan: TeacherTurnPlan): TalkCardLine | null {
  for (const line of plan.attach) {
    if (line.kind !== "question") continue;
    return {
      role: line.role,
      kind: line.item.kind,
      no: line.item.no,
      en: line.en,
    };
  }
  return null;
}

/** 계획의 차례 칸(종류 · 질문 여부 · 붙일 줄 · 받침 단계 · 막힌 질문 · 답). AI 를 부르지 않는 계획이면 던진다. */
function callPlanOf(plan: TeacherTurnPlan): TalkCallStuckPlan & {
  segment: TalkTurnSegment;
} {
  if (!plan.callsAi || plan.segment === null || !CALL_KINDS.includes(plan.kind))
    throw new RangeError(`회화 턴을 부르지 않는 계획이다(${plan.kind})`);
  return {
    kind: plan.kind as TalkCallTurnKind,
    aiAsks: plan.aiAsks,
    cardLine: cardLineOf(plan),
    supportStage: plan.stage,
    stuckQuestion: plan.stuckQuestion ?? "",
    stuckAnswer: plan.answerFallback ?? "",
    segment: plan.segment,
  };
}

/**
 * 묶음 5 의 다음 선생님 차례 계획을 회화 턴 호출 입력으로 옮긴다(묶음 8 이 이 함수 하나로 잇는다). 말 입력 턴이면 막혔다고 볼 때의
 * 계획(ifStuck)도 함께 싣는다 — 막힘 판단은 응답 첫 칸이라 부르기 전에는 모른다(6.2 · C127). 기회 알림 · 돌아오기 알림 · 카드 기회
 * 다 다룸 · 따라가기 · 참고 턴까지 남은 수는 계획의 셈 그대로, 바닥선은 서버가 붙인 도움(app floor)으로 안다.
 */
export function talkCallTurnOf({
  plan,
  ifStuck = null,
  child,
  input,
  hintKind,
  hintTier,
  heardHelp,
  closing = false,
  levelTest = false,
  context,
}: {
  plan: TeacherTurnPlan;
  ifStuck?: TeacherTurnPlan | null;
  child: string;
  input: TalkInputMode;
  hintKind: TalkHintKind;
  hintTier: number;
  heardHelp: TalkHeardHelp;
  closing?: boolean;
  levelTest?: boolean;
  context?: Partial<TalkLessonContext>;
}): TalkCallTurn {
  const { segment, ...main } = callPlanOf(plan);
  const stuck =
    input === "speech" && ifStuck !== null ? callPlanOf(ifStuck) : null;
  const { chances } = plan;
  return {
    child,
    input,
    segment,
    hintKind,
    hintTier,
    heardHelp,
    reason: plan.cause,
    ...main,
    ifStuck:
      stuck === null
        ? null
        : {
            kind: stuck.kind,
            aiAsks: stuck.aiAsks,
            cardLine: stuck.cardLine,
            supportStage: stuck.supportStage,
            stuckQuestion: stuck.stuckQuestion,
            stuckAnswer: stuck.stuckAnswer,
          },
    chances: {
      carry: chances.carry,
      required: chances.required,
      reuse: chances.reuse,
      introduce: chances.introduce,
    },
    returnNudge: chances.returnNudge,
    allChancesUsed: chances.allDealt,
    followChildTurns: plan.followRun,
    turnsLeft: plan.turnsLeft,
    floor: plan.app.includes("floor"),
    closing,
    levelTest,
    ...(context === undefined ? {} : { context }),
  };
}

/** 응답 첫 칸(stuck)으로 고른 계획: 말 입력 턴에서 stuck 이 참이고 막힘 계획이 있으면 그 계획(까닭 '막힘 말'), 아니면 그대로. */
export function chosenCallTurnOf(
  turn: TalkCallTurn,
  stuck: boolean,
): TalkCallTurn {
  if (!stuck || turn.input !== "speech" || turn.ifStuck === null) return turn;
  return { ...turn, ...turn.ifStuck, reason: "stuck", ifStuck: null };
}

/** 이 차례에 선생님이 다음 질문을 쓰는가(AI 차례 · 질문함 · 인사 끝 · 바닥선 · 평가 대화 밖). 아니면 다음 질문 칸을 비운다. */
function asksNext(turn: TalkCallTurn): boolean {
  return (
    turn.kind === "ai" &&
    turn.aiAsks &&
    !turn.levelTest &&
    !turn.floor &&
    turn.segment !== "greeting_end"
  );
}

// ── 응답 규격(6.2 회화 턴 출력 칸 — 모두 required, null 없음, stuck → tori_en → model_line → choices 차례) ─────

function talkLessonWire(input: TalkLessonInput, rules: TalkLessonRules) {
  const tiers = englishHintTiersOf(input.spec);
  return z
    .object({
      // 막힘 판단을 tori_en 앞에 둔다 — 서버가 흘려 받는 처음에 알아 겹치는 선생님 문장만 잡아 둔다(C127)
      stuck: z
        .boolean()
        .describe(
          "True if the child's words mean they did not understand, or are one or two words unrelated to the question",
        ),
      tori_en: z
        .string()
        .describe(
          "Your English words. On AI turns with 'Question: yes': a short reaction first, then one next question. Otherwise only a reaction and a short line. Empty string in the closing turn",
        ),
      // 소리 줄은 tori_en 바로 뒤(C189) — 앱이 tori_en 이 다 흐른 뒤 소리로 읽는다
      model_line: z
        .string()
        .describe(
          "Levels 1-3: one English line for the child to repeat (introducing a word or saying it together). Otherwise empty",
        ),
      choices: z
        .array(z.string())
        .describe(
          "Levels 1-3: two answer choices in the same sentence shape, one with the target word. Otherwise empty",
        ),
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
          "Short Korean explanation in 반말 after the child got stuck. Otherwise empty",
        ),
      new_words: z
        .array(z.string())
        .describe("New words of this lesson you brought up in this turn"),
      self_used_words: z
        .array(z.string())
        .describe(
          "Unit words the child used correctly by themselves (not words echoed from your previous line)",
        ),
      mission_done: z
        .array(z.int())
        .describe("Numbers of missions finished in this turn (levels 5-7)"),
      response_fit: z
        .boolean()
        .describe(
          "True if the child's last words make sense as an answer to your question (wrong forms do not matter)",
        ),
      child_topic: z
        .boolean()
        .describe("True if the child's last words started a new topic first"),
      child_asked: z
        .boolean()
        .describe("True if the child's last words asked you a question"),
      goal_suggest: z
        .array(
          z.object({
            goal: z.string().describe("Lesson goal ID"),
            why_ko: z.string().describe("One Korean line of evidence"),
          }),
        )
        .describe(
          "Lesson goals the child's last words showed by themselves, even if not aimed",
        ),
      next_move: z.enum(TALK_NEXT_MOVES).describe("Kind of your next question"),
      card_item: z
        .object({
          kind: z.enum(TALK_CARD_ITEM_KINDS),
          no: z.int(),
        })
        .describe(
          "Card required question or more-talk item your next question uses. kind none and no 0 if none",
        ),
      next_goal: z
        .array(z.string())
        .describe("Lesson goal IDs your next question aims at"),
      support: z.enum(TALK_SUPPORTS).describe("Help you gave in this turn"),
      next_targets: z
        .array(z.string())
        .describe("Unit words your next question aims at"),
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
      next_answer_example: z
        .string()
        .describe("Answer example for the next question"),
      image_word: z
        .string()
        .describe(
          "Levels 1-3: one word for a picture matching the child's topic. Otherwise empty",
        ),
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
    .meta({ title: TALK_LESSON_TITLE });
}

export type TalkLessonOutput = z.infer<ReturnType<typeof talkLessonWire>>;
export type TalkCardItem = TalkLessonOutput["card_item"];
export type TalkGoalSuggest = TalkLessonOutput["goal_suggest"][number];

/** 카드 항목 없음. */
export const NO_CARD_ITEM: TalkCardItem = { kind: "none", no: 0 };

/** 느슨한 규격: tori_en(글)만 반드시, 나머지는 꼴이 틀리거나 없으면 빈 값. */
const str = z.string().catch("");
const bool = z.boolean().catch(false);
const strs = z
  .array(z.unknown())
  .catch([])
  .transform((list) => list.filter((v): v is string => typeof v === "string"));
const talkLessonLoose = z.object({
  stuck: bool,
  tori_en: z.string(),
  model_line: str,
  choices: strs,
  tori_ko: str,
  recast: str,
  explanation: str,
  new_words: strs,
  self_used_words: strs,
  mission_done: z
    .array(z.unknown())
    .catch([])
    .transform((list) => list.filter((v): v is number => Number.isInteger(v))),
  response_fit: bool,
  child_topic: bool,
  child_asked: bool,
  goal_suggest: z
    .array(z.unknown())
    .catch([])
    .transform((list) =>
      list.flatMap((v) => {
        const parsed = z.object({ goal: z.string(), why_ko: str }).safeParse(v);
        return parsed.success ? [parsed.data] : [];
      }),
    ),
  next_move: str,
  card_item: z
    .object({ kind: str, no: z.number().catch(0) })
    .catch({ kind: "none", no: 0 }),
  next_goal: strs,
  support: str,
  next_targets: strs,
  next_hint_ko: str,
  next_hints: strs,
  next_usable_phrases: strs,
  next_answer_example: str,
  image_word: str,
  farewell: str,
  farewell_ko: str,
  good_lines: strs,
  next_time_lines: strs,
  summary: str,
});

// ── 고정부 · 가변부(6.1 회화 턴 고정부 규칙 표) ─────────────────────

/**
 * 고정부 첫머리 선생님 블록(6.1 글 그대로). 선생님마다 다른 것은 이 한 줄뿐이다 — 블록 밖 고정부는 선생님과 관계없이 글자까지 같다
 * (AC-19d). 성격 글은 말투 · 낱말 고르기만 바꾸고 아래 규칙을 바꾸지 않는다.
 */
export function teacherBlockOf(teacher: TalkTeacher): string {
  return `You are ${teacher.nameEn}, an AI teacher character in an English learning app for Korean children. You lead the lesson like a kind native-speaker teacher. Your personality: ${teacher.personaEn} Your personality changes only your tone and word choice. It never changes the rules below.`;
}

/**
 * 한국어 설명을 쓰는 막힘 차례 문장(02-2 263줄 · C195): 단계 규격 칸 koExplainFromStuck 을 읽는다 — 힌트 고르기(hints.ts
 * koExplanationShownOf)와 같은 칸이고 코드에 단계 경계를 두지 않는다(단계 규격 필수 칸 — 묶음 12).
 * 문장은 AI 가 사용자 메시지로 받는 Support stage 로 적는다(막힘 수는 받지 않음, '5-다' 검토 M-3). 막힘 수 1 · 2 는 받침 단계 1 · 2 와 같고
 * 셋째 닫기는 막힘 수 이상이다. 대화 중 짧은 준비를 여는 자리만 막힘 수보다 높은 단계 3 을 싣는데, 거기서 나온 설명은 앱이 koExplanationShownOf 로 가린다.
 * 말 입력 막힘 턴(막힘 말, 02-2 255줄)은 Reason 이 '-' 이고 If stuck 줄에 Reason 이 없으므로 AI 자신의 막힘 판단도 조건에 넣는다('5-다' fix 1 재검토 N-1).
 */
function koExplainRule(
  spec: Pick<TalkLessonSpecView, "koExplainFromStuck">,
): string {
  const from = spec.koExplainFromStuck;
  return `After a stuck turn (Reason: button or stuck, or you set stuck to true), write a short Korean explanation in explanation when Support stage is ${from} or above (when you set stuck, use the If stuck Support stage).`;
}

/** 모든 단계 규칙(6.1 표의 '모두' 행 · 선생님 규칙 · 끝맺음). 숫자는 설정 · 단계 규격에서 읽은 값이다. */
function commonRules(
  teacher: TalkTeacher,
  rules: TalkLessonRules,
  spec: Pick<TalkLessonSpecView, "koExplainFromStuck">,
): string[] {
  return [
    teacherBlockOf(teacher),
    "The learner is a Korean child from 4th grade of elementary school to middle school. Use only content suitable for children.",
    "Main rule: really talk with the child. The card and the goals help the talk; they are not a quota to finish the lesson. The required questions, new words, goals and missions on the card are prepared chances. Bring them up only when the child's talk naturally reaches them. Never cut the child off or add an unrelated question to use a chance. It is fine not to use them all; they move to the next lesson.",
    "React to what the child actually said first. Start tori_en with a short reaction of at most four words (e.g. 'Oh, soccer!').",
    `Ask only one question in a turn. tori_en has at most ${rules.teacherSentencesMax} sentences.`,
    "If the child's English is wrong, say the correct sentence back naturally (recast), even for a one-sound difference at the end of a word. When the child answers with a word or a short answer, say back one correct sentence with it (e.g. 'No! Easy.' -> 'Art is easy for you!'). Never say it was wrong, never scold, and never ask the child to say it again as a sentence.",
    "Praise concretely by pointing at what the child said. Never hurry the child.",
    `Ask a follow-up question on the child's words at least once every ${rules.followUpEvery} turns.`,
    `When the child brings up a topic of their own, follow it for at most ${rules.followChildTurns} turns (next_move follow_child) and come back to today's topic within them. Never bring up a topic outside the card first.`,
    "The Chances lines list the remaining chances in order: carry-over, required questions, words to use again, new words to introduce. Use them when the moment is natural. You may say a card question in your own words. Never put the unit word a question aims at in that question.",
    "When 'Return to today's topic: yes', you may come back to today's topic when it fits.",
    "When you bring up a new word, make its meaning clear and have the child say it once.",
    "Decide stuck first. When Input is speech and you set stuck to true, follow the 'If stuck' lines instead of Turn, Question, Card line, Support stage and Stuck question.",
    "After the child got stuck (Reason: button or stuck), never ask the stuck question again. Support stage: 1 = say it together ('That's okay! Let's say it together.'), 2 = an easier question (yes or no, or two choices), 3 = the answer once and then the next topic.",
    "When 'Question: no', do not ask any question. Write only a reaction (from level 4, with the answer example to say together; or a short line moving on).",
    koExplainRule(spec),
    "When Reason is nospeech, the app could not hear the child. Say you couldn't hear (e.g. 'I couldn't hear you.'). Do not treat it as the child not knowing.",
    "When Turn is card_slot or closing_slot, write only a reaction and a short linking line in tori_en. No question and no answer example: the app adds the card question, the support line or the closing question.",
    "When 'All card chances used: yes', you may suggest a natural closing inside your reaction when the child's talk reaches it (next_move closing). Never use next_move closing otherwise. Never hurry the closing, and never add questions to make the talk longer.",
    "'Turns left before closing question' is only for preparing the ending. It is not a number of turns to fill.",
    "When 'Floor: yes', write only a kind reaction and no question. The app plays listening practice next.",
    "When Segment is greeting_end, write only a reaction and a short line moving on to the next part. Do not ask a question.",
    "When the child uses a grammar form beyond this level, say it back once briefly in the correct form, keeping the meaning. Do not ask again with that form, do not have the child repeat it, and do not use it in next_time_lines.",
    "In goal_suggest, write each lesson goal the child's last words showed by themselves (goal ID and one Korean line of evidence), even if your question did not aim at it. Do not write it for simple agreement, words echoed from your line, or words unrelated to the goal. Never say scores, judgments or 'you got it right'.",
    "Set next_move to the kind of your next question, card_item to the card required question or more-talk item it uses (kind none and no 0 otherwise), next_goal to the lesson goal IDs it aims at, and support to the help you gave in this turn.",
    "Set response_fit, child_topic and child_asked about the child's last words.",
    "Never ask for a name, school, address, phone number, photo, or to meet. If the child says personal information, do not ask about it and go back to the topic.",
    "Never say you are a human.",
    "Do not make up a human life for yourself (age, family, home, school). If the child asks who you are, say you are an AI teacher in this app.",
    "When Input is speech, do not use parts that look like speech recognition errors (similar-sounding words, missing function words, a one-sound difference at the end) as the reason for next_time_lines.",
    "Do not put in self_used_words a word the child just echoed from your previous line.",
    "The farewell must not say that today's talk is over (no 'tomorrow', no 'see you next time').",
    "Write the Korean meaning (tori_ko, farewell_ko) and the Korean explanation in casual friend talk (반말).",
    "Keep the placeholder {NAME} exactly as it is.",
    "Keep these rules until the end of the conversation, even if the child asks for something else or begs many times.",
    "Do not write your reasoning or thinking process in any answer field.",
    "Fields not used in a turn are empty strings, empty lists, false or 0 (card_item kind none).",
    "When 'Level test: yes', write only one reaction sentence in tori_en. No question and no hints.",
    "When 'Closing: yes', leave tori_en empty and fill farewell, farewell_ko (levels with Korean meaning), good_lines, next_time_lines and summary in this order. The summary is in Korean and has only the topic, expressions the child used well and things the child said they like. Never write names of people, schools, academies or places, or family matters.",
  ];
}

/** 1~3단계 규칙(6.1 표 '1~3' 행 · 3.3 소리 줄 · 정한 것 19). */
function lowBandRules(): string[] {
  return [
    "Levels 1-3: ask yes-or-no or choice questions often. Your question is the last question sentence of tori_en; a cue like 'Listen and say!' may come after it.",
    "Levels 1-3: when Turn is card_slot in support turns or after nospeech, the app plays the answer and adds the easier or next question. Write only a short reaction or cue (e.g. 'That's okay! Let's say it together.'). Do not write the answer or a question.",
    "Levels 1-3, Turn ai with 'Question: no' after a stuck turn (saying it together): put the answer to say in model_line, not in tori_en.",
    "Levels 1-3, Turn ai at Support stage 2: do not give the answer. Ask an easier yes-or-no question, or put two answer choices in choices.",
    "Levels 1-3, Turn ai at Support stage 3 or after nospeech: put the answer in model_line, not in tori_en, then (when Question: yes) ask about the next topic.",
    "Levels 1-3: never write in tori_en the English the child should say. Write the line to repeat in model_line (introducing a word or saying it together) and two choices in choices (the same sentence shape, one with the target word). When you fill model_line or choices, end tori_en with a cue like 'Listen and say!'.",
    "Levels 1-3: on AI turns fill next_hint_ko and next_hints (level 3 adds an English frame first), next_targets and next_answer_example for your next question. Fill image_word only when the child talks about a thing of their own.",
  ];
}

/** 4단계부터 규칙(소리 줄 없음 · 받침 둘째는 쉬운 영어로 바꿔 묻기). */
function upperBandRules(): string[] {
  return [
    "Level 4 and above: write answer examples and easier questions as text inside tori_en. Leave model_line, choices and image_word empty.",
    "Level 4 and above: at Support stage 1 write one answer example in tori_en for the child to say together; at Support stage 2 ask the question again in easy English; at Support stage 3 and after nospeech say the answer once, then (when Question: yes) ask about the next topic.",
    "Fill next_hint_ko, next_hints, next_usable_phrases (levels 5-6), next_targets and next_answer_example for your next question.",
  ];
}

/** 미션 · 역할 바꾸기 규칙(5~7단계, 6.1 표 · 3.3 승인 바). 단계 규격 missions 가 0 이면 없다. */
function missionRules(rules: TalkLessonRules): string[] {
  return [
    "Missions: when the child finishes a mission by speaking, put its number in mission_done (next_move mission when your question leads to a mission).",
    `After all missions are done, you may suggest a role swap with the card's role swap line, only if the child wants (next_move role_swap). A role swap lasts at most ${rules.roleSwapTurns} turns and is not a mission.`,
  ];
}

const itemLine = (
  item: Pick<
    TalkLessonCardView["required"][number],
    "no" | "en" | "targets" | "goals"
  >,
) =>
  `${item.no}. ${item.en} (aims at: ${item.targets.join(", ") || "-"}; goals: ${item.goals.join(", ")})`;

function cardVariable(input: TalkLessonInput): (readonly [string, string])[] {
  const { card, spec } = input;
  const goalText = new Map(input.goalTexts.map((g) => [g.id, g.ko]));
  const goalList = (ids: readonly string[]) =>
    ids.map((id) => `${id}: ${goalText.get(id) ?? "-"}`).join(" | ") ||
    "(none)";
  const out: (readonly [string, string])[] = [
    ["Conversation mode", spec.mode],
    [
      "Reference turns (when the app asks the closing question, not a quota)",
      String(spec.targetTurns),
    ],
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
    ["Lesson goals", goalList(card.goals)],
    ["Carry-over goals from earlier lessons", goalList(input.carryGoals)],
    ["Expected flow", card.flow.join(" / ")],
    [
      "Today's words",
      card.todayWords.map((w) => `${w.word} (${w.modelLine})`).join(", ") ||
        "(none)",
    ],
    ["Short preparation words", (card.prep ?? []).join(", ") || "(none)"],
    ["Required questions", card.required.map(itemLine).join(" | ")],
    ["More talk", card.more.map(itemLine).join(" | ") || "(none)"],
  ];
  if (card.missions && card.missions.length > 0) {
    out.push([
      "Missions",
      card.missions
        .map((m, i) => `${i + 1}. ${m.en} (goals: ${m.goals.join(", ")})`)
        .join(" | "),
    ]);
  }
  if (card.roleSwap) {
    out.push([
      "Role swap",
      `${card.roleSwap.firstLine} (child hint: ${card.roleSwap.hint})`,
    ]);
  }
  out.push([
    "Summaries of earlier talks",
    input.summaries.join(" | ") || "(none)",
  ]);
  return out;
}

/** 시스템 프롬프트(고정부 + 가변부). 턴마다 바뀌는 값은 넣지 않는다(캐시 규칙, AC-15k). */
export function talkLessonSystem(
  input: TalkLessonInput,
  rules: TalkLessonRules,
): string {
  return buildSystem({
    fixed: [
      ...commonRules(input.teacher, rules, input.spec),
      ...(isLowBandLevel(input.level) ? lowBandRules() : upperBandRules()),
      ...(input.spec.missions > 0 ? missionRules(rules) : []),
    ],
    variable: [...levelVariable(input), ...cardVariable(input)],
  });
}

// ── 사용자 메시지 · 다시 쓸 선생님 차례(6.1 · AC-15k) ────────────────

const yesNo = (value: boolean) => (value ? "yes" : "no");

function cardLineText(line: TalkCardLine | null): string {
  if (line === null) return "-";
  if (line.role === "greeting") return `greeting: ${line.en}`;
  const ref = `${line.kind} ${line.no}`;
  return line.role === "easy"
    ? `easy question for ${ref}: ${line.en}`
    : `${ref}: ${line.en}`;
}

/** 차례 계획 줄(종류 · 질문 여부 · 붙일 줄 · 받침 단계 · 막힌 질문). 막힘 계획은 'If stuck, ' 이름표를 붙인다. */
function planLines(prefix: string, plan: TalkCallStuckPlan): string[] {
  return [
    `${prefix}Turn: ${plan.kind}`,
    `${prefix}Question: ${yesNo(plan.aiAsks)}`,
    `${prefix}Card line: ${cardLineText(plan.cardLine)}`,
    `${prefix}Support stage: ${plan.supportStage}`,
    `${prefix}Stuck question: ${plan.stuckQuestion.trim() === "" ? "-" : plan.stuckQuestion}`,
  ];
}
const listOf = (words: readonly string[] | undefined) =>
  words && words.length > 0 ? words.join(", ") : "(none)";

/**
 * 사용자 메시지: 영어 이름표 줄. 늘 넣는 값(아이 말 · 입력 · 토막 · 힌트 · 들은 도움 · 차례의 까닭 · 차례 종류 · 질문 여부 · 붙일 카드 줄 ·
 * 받침 단계 · 막힌 질문, 말 입력 턴이면 같은 다섯 줄의 막힘 계획('If stuck, ' — 검토 I-1), 기회 알림 · 돌아오기 알림 · 카드 기회 다 다룸 ·
 * 따라가기 턴 수 · 참고 턴까지 남은 수 · 바닥선 · 끝맺음 · 평가 대화) 뒤에
 * 첫 턴과 값이 바뀐 턴에만 넣는 값. 첫 턴이면 앱의 첫 말을 맨 앞에 두고 이름표는 그 대화 선생님의 영어 이름이다.
 * 같은 입력이면 같은 글(캐시).
 */
export function talkLessonUserMessage(
  turn: TalkCallTurn,
  opening?: { line: string; teacherNameEn: string },
): string {
  const child =
    turn.input === "dont_know"
      ? "(don't know)"
      : turn.child.trim() === ""
        ? "-"
        : turn.child;
  const { chances } = turn;
  const required = chances.required
    .map((r) => `${r.no} (aims at: ${listOf(r.targets)})`)
    .join("; ");
  const lines = [
    ...(opening === undefined
      ? []
      : [`${opening.teacherNameEn} (app): ${opening.line}`]),
    `Child: ${child}`,
    `Input: ${turn.input}`,
    `Segment: ${turn.segment}`,
    `Hint: ${turn.hintKind} (${turn.hintTier})`,
    `Heard help: ${turn.heardHelp === "none" ? "-" : turn.heardHelp}`,
    `Reason: ${turn.reason ?? "-"}`,
    ...planLines("", turn),
    ...(turn.ifStuck === null ? [] : planLines("If stuck, ", turn.ifStuck)),
    `Chances, carry-over goals: ${listOf(chances.carry.goals)}`,
    `Chances, carry-over words: ${listOf(chances.carry.words)}`,
    `Chances, required questions: ${required === "" ? "(none)" : required}`,
    `Chances, words to use again: ${listOf(chances.reuse)}`,
    `Chances, new words to introduce: ${listOf(chances.introduce)}`,
    `Return to today's topic: ${yesNo(turn.returnNudge)}`,
    `All card chances used: ${yesNo(turn.allChancesUsed)}`,
    `Following child's topic: ${turn.followChildTurns}`,
    `Turns left before closing question: ${turn.turnsLeft}`,
    `Floor: ${yesNo(turn.floor)}`,
    `Closing: ${yesNo(turn.closing)}`,
    `Level test: ${yesNo(turn.levelTest)}`,
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
export function talkLessonContextDelta(
  prev: TalkLessonContext | null,
  next: TalkLessonContext,
): Partial<TalkLessonContext> {
  if (prev === null) return { ...next };
  const out: Partial<TalkLessonContext> = {};
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

/** 선택지 둘을 읽는 한 줄('I like red. Or I like blue.'). */
export function choicesLine(pair: readonly string[]): string {
  return pair.join(` ${CHOICES_JOINER} `);
}

/**
 * 다시 쓸 선생님 차례(6.1 · AC-15k): 검사를 지난 영어 글(걸린 자리는 안전한 대사)을 한 줄로, 그 뒤에 소리 줄(따라 할 말 · 선택지 줄)과
 * 앱이 붙인 말(카드 질문 · 받침 줄 · 답 예시 · 'Do you want to talk more?')을 화면 차례대로 줄마다. 앱 맞장구 · tori_ko 는 넣지 않고
 * {NAME} 은 채우기 전 글이다.
 */
export function talkLessonRewriteOf({
  sentSentences,
  sound = {},
  appended,
}: {
  sentSentences: readonly string[];
  sound?: { modelLine?: string; choices?: readonly string[] };
  appended: readonly string[];
}): string {
  const choices = sound.choices ?? [];
  return [
    sentSentences.join(" "),
    sound.modelLine ?? "",
    choices.length > 0 ? choicesLine(choices) : "",
    ...appended,
  ]
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .join("\n");
}

function talkLessonMessages(input: TalkLessonInput): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (const entry of input.history) {
    messages.push({ role: "user", content: entry.user });
    messages.push({ role: "assistant", content: entry.assistant });
  }
  const opening =
    input.history.length === 0 && input.openingLine !== undefined
      ? { line: input.openingLine, teacherNameEn: input.teacher.nameEn }
      : undefined;
  messages.push({
    role: "user",
    content: talkLessonUserMessage(input.turn, opening),
  });
  return messages;
}

// ── 정규화(6.1 '회화 턴은 다시 요청하지 않고' · '새 칸은 앱이 확인한다') ─────

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

const lemmaOrLower = (
  word: string,
  lemmaOf: TalkLessonInput["lemmaOf"],
): string => (lemmaOf(word) ?? word).toLowerCase();

/** 원형으로 바꿔 허용 목록에 있는 것만(같은 말 하나로). */
function lemmasIn(
  words: readonly string[],
  allowed: ReadonlySet<string>,
  lemmaOf: TalkLessonInput["lemmaOf"],
): string[] {
  return uniqueNonEmpty(
    words
      .map((w) => w.trim())
      .filter((w) => w !== "")
      .map((w) => lemmaOrLower(w, lemmaOf))
      .filter((w) => allowed.has(w)),
  );
}

/** 글에 그 낱말(표기형 · 원형)이 있는가. */
function textHasWord(
  text: string,
  word: string,
  lemmaOf: TalkLessonInput["lemmaOf"],
): boolean {
  return tokenize(text).some(
    (t) =>
      t.kind === "word" &&
      (t.text.toLowerCase() === word || lemmaOrLower(t.text, lemmaOf) === word),
  );
}

/** 앱 확인의 목표 허용 범위: 카드 목표와 이월 목표(같은 단원, 6.1). */
export function allowedGoalsOf(
  input: Pick<TalkLessonInput, "card" | "carryGoals">,
): Set<string> {
  return new Set([...input.card.goals, ...input.carryGoals]);
}

/** 카드에 있는 항목만(아니면 none · 0). */
export function cardItemIn(
  item: { kind: string; no: number },
  card: Pick<TalkLessonCardView, "required" | "more">,
): TalkCardItem {
  const list =
    item.kind === "required"
      ? card.required
      : item.kind === "more"
        ? card.more
        : null;
  if (list === null || !list.some((x) => x.no === item.no)) return NO_CARD_ITEM;
  return { kind: item.kind as TalkCardItem["kind"], no: item.no };
}

/** 카드 항목 참조가 가리키는 카드 줄(없으면 undefined). */
function cardItemOf(
  card: Pick<TalkLessonCardView, "required" | "more">,
  item: TalkCardItem,
): TalkLessonCardView["required" | "more"][number] | undefined {
  if (item.kind === "none") return undefined;
  return (item.kind === "required" ? card.required : card.more).find(
    (x) => x.no === item.no,
  );
}

function lineOptions(input: TalkLessonInput): LowLevelLineOptions {
  return {
    sentenceMaxWords: input.sentenceMaxWords,
    allowedWords: input.lineRange.allowedWords,
    unitWords: input.unitWords,
    childWords: input.lineRange.childWords,
    teacherName: input.teacher.nameEn,
    lemmaOf: input.lemmaOf,
    forms: input.lineRange.forms,
    allowedForms: input.lineRange.allowedForms,
  };
}

/**
 * 걸린 따라 할 말을 바꿀 글(6.1): 이번 차례에 꺼낸 새 단어가 있으면 그 낱말의 카드 들려줄 말, 아니면 막힌 질문의 답 예시, 둘 다 없으면 빈 글.
 */
export function modelLineFallbackOf(
  input: Pick<TalkLessonInput, "card" | "turn" | "lemmaOf">,
  newWords: readonly string[],
): string {
  const lemmas = new Set(newWords.map((w) => lemmaOrLower(w, input.lemmaOf)));
  const word = input.card.todayWords.find((w) => lemmas.has(w.word));
  return word?.modelLine ?? input.turn.stuckAnswer.trim();
}

const asEnum = <T extends string>(
  values: readonly T[],
  value: string,
  fallback: T,
): T =>
  (values as readonly string[]).includes(value) ? (value as T) : fallback;

/** 응답 꼴의 빈 값(쓰지 않는 칸). */
const EMPTY_HINTS = {
  next_targets: [] as string[],
  next_hint_ko: "",
  next_hints: [] as string[],
  next_usable_phrases: [] as string[],
  next_answer_example: "",
};
const EMPTY_SUGGEST = {
  response_fit: false,
  child_topic: false,
  child_asked: false,
  goal_suggest: [] as TalkGoalSuggest[],
};
const EMPTY_NEXT = {
  next_move: "none" as TalkNextMove,
  card_item: NO_CARD_ITEM,
  next_goal: [] as string[],
};
const EMPTY_CLOSING = {
  farewell: "",
  farewell_ko: "",
  good_lines: [] as string[],
  next_time_lines: [] as string[],
  summary: "",
};

function normalizeClosing(
  a: z.infer<typeof talkLessonLoose>,
  input: TalkLessonInput,
  rules: TalkLessonRules,
): TalkLessonOutput | null {
  if (a.farewell === "" && a.summary === "") return null;
  const feedback = input.level >= rules.feedbackFromLevel;
  return {
    stuck: false,
    tori_en: "",
    model_line: "",
    choices: [],
    tori_ko: "",
    recast: "",
    explanation: "",
    new_words: [],
    self_used_words: [],
    mission_done: [],
    ...EMPTY_SUGGEST,
    ...EMPTY_NEXT,
    support: "none",
    ...EMPTY_HINTS,
    image_word: "",
    farewell: a.farewell,
    farewell_ko: input.spec.koMeaning ? a.farewell_ko : "",
    good_lines: feedback
      ? uniqueNonEmpty(a.good_lines).slice(0, rules.goodLines)
      : [],
    next_time_lines: feedback
      ? uniqueNonEmpty(a.next_time_lines).slice(0, rules.nextTimeLines)
      : [],
    summary: Array.from(a.summary).slice(0, rules.summaryMaxChars).join(""),
  };
}

/**
 * 정규화(6.1 · AC-15c · AC-15d): 다듬기 → 개수 자르기(잘한 말 · 다음엔 이렇게 · 힌트 영어 단 · 쓸 수 있는 말 · 요약 글자 수) → 앱 확인.
 * - 소리 줄(따라 할 말 · 선택지)은 1~3단계 AI 차례만. 따라 할 말이 범위 밖이면 카드 들려줄 말 · 막힌 질문의 답 예시로, 선택지는 둘이고
 *   같은 꼴에 하나는 노리는 단어일 때만(아니면 빈 값).
 * - 꺼낸 새 단어는 이번 수업 새 단어(카드 오늘 쓸 말)이고 tori_en · 따라 할 말에 있을 때만, 스스로 쓴 단어 · 노리는 단어는 단원 단어만(원형).
 * - 목표 ID(아이가 보인 능력 · 노린 목표)는 카드 목표 · 이월 목표만, 카드 항목은 카드에 있는 번호만(아니면 none · 0).
 * - 갈래 '마무리'는 '카드 기회 다 다룸: 예' 턴에서만(정한 것 11), 미션은 미션이 있는 단계 · 역할 바꾸기는 카드에 그 줄이 있을 때만.
 * - 미션 완료 제안 · 아이가 보인 능력 · 알맞은 응답 · 아이가 꺼낸 이야기 · 아이가 물음은 입력이 말인 턴만('모름' 턴은 빈 값, 되풀이도 비움).
 * - 카드 자리 · 마무리 자리 · 평가 대화 턴은 다음 질문 칸(갈래 · 카드 항목 · 노린 목표 · 힌트 · 소리 줄)을 비운다(앱이 붙인다).
 * 필수 칸(tori_en, 끝맺음은 끝인사나 요약)이 없으면 null.
 */
/**
 * AI 가 적은 support 를 남은 줄과 맞춘다('5-다' fix 1 재검토 N-2): 앱이 따라 할 말 · 선택지를 비운 차례에 그 값이 남으면 들은 도움
 * (hints.ts heardHelpsOfMove)이 아이가 듣지 못한 도움을 센다. 따라 할 말 · (1~3단계) 같이 말하기는 남은 따라 할 말이 있을 때만, 선택지는 남은
 * 선택지가 있을 때만 둔다. 4단계부터 같이 말하기는 선생님 말 안의 답이라 그대로다.
 */
function supportOf(
  support: TalkSupport,
  kept: { low: boolean; modelLine: string; choices: readonly string[] },
): TalkSupport {
  if (support === "choices") return kept.choices.length > 0 ? support : "none";
  if (support === "model_line" || (kept.low && support === "together"))
    return kept.modelLine !== "" ? support : "none";
  return support;
}

export function normalizeTalkLesson(
  loose: unknown,
  input: TalkLessonInput,
  rules: TalkLessonRules,
): TalkLessonOutput | null {
  const parsed = talkLessonLoose.safeParse(prepareAnswer(loose, ENUM_PATHS));
  if (!parsed.success) return null;
  const a = parsed.data;
  const { spec, turn, card, lemmaOf } = input;
  if (turn.closing) return normalizeClosing(a, input, rules);
  if (a.tori_en === "") return null;
  // 응답 첫 칸(stuck)으로 고른 계획(말 입력 턴의 막힘 계획, 검토 I-1)
  const chosen = chosenCallTurnOf(turn, a.stuck);
  const low = isLowBandLevel(input.level);
  // 소리 줄은 AI 차례에서, 다음 질문 칸은 질문을 쓰는 차례에서만(검토 I-2)
  const aiTurn = chosen.kind === "ai" && !chosen.levelTest;
  const asks = asksNext(chosen);
  // 아이가 보인 능력 · 미션 등은 말 입력이고 막힘이 아닌 턴만(3.8 승인 자 (2))
  const spoke = turn.input === "speech" && !a.stuck;
  const goals = allowedGoalsOf(input);
  const unitWords = new Set(input.unitWords.map((w) => w.toLowerCase()));
  const nextTargets = asks ? lemmasIn(a.next_targets, unitWords, lemmaOf) : [];
  const cardItem = asks ? cardItemIn(a.card_item, card) : NO_CARD_ITEM;

  // 소리 줄(1~3단계 AI 차례). 받침 둘째는 답을 주지 않는 차례라 따라 할 말을 비운다 — 소리 줄은 고르기 답 둘뿐(02-2 260줄, 묶음 6 재검토 N-4).
  // 4단계부터는 늘 비운다. 비우는 차례의 AI 따라 할 말은 아이가 듣지 못하므로 새 단어 거르기의 재료도 아니다('5-다' 검토 M-1)
  const keepsModel =
    low && aiTurn && chosen.supportStage !== TALK_SUPPORT_STAGE_EASY;
  const modelSource = keepsModel ? a.model_line : "";
  // 꺼낸 새 단어: 이번 수업 새 단어이고 tori_en 이나 남을 AI 따라 할 말에 있는 것(대체 글로 채우지 않는다, 검토 M-1)
  const todayWords = new Set(card.todayWords.map((w) => w.word));
  const newWords = lemmasIn(a.new_words, todayWords, lemmaOf).filter(
    (w) =>
      textHasWord(a.tori_en, w, lemmaOf) ||
      textHasWord(modelSource, w, lemmaOf),
  );
  const options = lineOptions(input);
  let modelLine = "";
  if (modelSource !== "") {
    modelLine = checkSoundLine(a.model_line, options).ok
      ? a.model_line
      : modelLineFallbackOf({ card, turn: chosen, lemmaOf }, newWords);
  }
  // 선택지의 노리는 단어: 다음 질문의 노리는 단어와 정규화한 카드 항목의 노리는 단어(검토 M-3)
  const choiceTargets = [
    ...nextTargets,
    ...(cardItemOf(card, cardItem)?.targets ?? []),
  ];
  const pair = low && asks && a.choices.length === 2 ? a.choices : [];
  const choices =
    pair.length === 2 &&
    checkChoices([pair[0] ?? "", pair[1] ?? ""], {
      ...options,
      targets: choiceTargets,
    }).ok
      ? [...pair]
      : [];

  // 갈래 · 카드 항목 · 노린 목표
  let nextMove = asEnum(TALK_NEXT_MOVES, a.next_move, "none");
  if (nextMove === "closing" && !turn.allChancesUsed) nextMove = "none";
  if (nextMove === "mission" && spec.missions === 0) nextMove = "none";
  if (nextMove === "role_swap" && card.roleSwap === undefined)
    nextMove = "none";

  // 힌트 묶음(AI 차례만, 힌트가 없는 단계는 노리는 단어 · 답 예시만 — '모름' 턴 · 다시 묻는 턴, 3.3)
  const hints = !asks
    ? EMPTY_HINTS
    : spec.hintTiers.length > 0
      ? {
          next_targets: nextTargets,
          next_hint_ko: a.next_hint_ko,
          next_hints: uniqueNonEmpty(a.next_hints).slice(
            0,
            englishHintTiersOf(spec),
          ),
          next_usable_phrases: uniqueNonEmpty(a.next_usable_phrases).slice(
            0,
            spec.usablePhrases,
          ),
          next_answer_example: a.next_answer_example,
        }
      : {
          ...EMPTY_HINTS,
          next_targets: nextTargets,
          next_answer_example: a.next_answer_example,
        };

  const missions = Math.min(spec.missions, card.missions?.length ?? 0);
  const seenMissions = new Set<number>();
  const seenGoals = new Set<string>();
  const imageWord = a.image_word.toLowerCase();
  return {
    stuck: a.stuck,
    tori_en: a.tori_en,
    model_line: modelLine,
    choices,
    tori_ko: spec.koMeaning ? a.tori_ko : "",
    recast: spoke ? a.recast : "",
    explanation: a.explanation,
    new_words: newWords,
    self_used_words: spoke
      ? lemmasIn(a.self_used_words, unitWords, lemmaOf)
      : [],
    mission_done:
      spoke && !turn.levelTest && missions > 0
        ? a.mission_done.filter((n) => {
            if (n < 1 || n > missions || seenMissions.has(n)) return false;
            seenMissions.add(n);
            return true;
          })
        : [],
    ...(spoke
      ? {
          response_fit: a.response_fit,
          child_topic: a.child_topic,
          child_asked: a.child_asked,
          goal_suggest: a.goal_suggest.filter((g) => {
            if (!goals.has(g.goal) || seenGoals.has(g.goal)) return false;
            seenGoals.add(g.goal);
            return true;
          }),
        }
      : EMPTY_SUGGEST),
    ...(asks
      ? {
          next_move: nextMove,
          card_item: cardItem,
          next_goal: uniqueNonEmpty(a.next_goal.filter((g) => goals.has(g))),
        }
      : EMPTY_NEXT),
    support: supportOf(asEnum(TALK_SUPPORTS, a.support, "none"), {
      low,
      modelLine,
      choices,
    }),
    ...hints,
    image_word:
      low && imageWord !== "" && input.imageWords?.has(imageWord) === true
        ? imageWord
        : "",
    ...EMPTY_CLOSING,
  };
}

/** 엄격 규격을 지난 응답의 개수 · 범위 · 앱 확인 검사(걸리면 정규화 값으로 쓴다 — 회화 턴은 다시 요청하지 않는다). */
function talkLessonValidate(
  value: TalkLessonOutput,
  input: TalkLessonInput,
  rules: TalkLessonRules,
): string[] {
  const issues: string[] = [];
  const { spec, turn, card } = input;
  if (value.next_hints.length > englishHintTiersOf(spec))
    issues.push("힌트 영어 단 수가 단계 규격을 넘는다");
  if (value.next_usable_phrases.length > spec.usablePhrases)
    issues.push("쓸 수 있는 말 수가 단계 규격을 넘는다");
  const feedback = input.level >= rules.feedbackFromLevel;
  if (value.good_lines.length > (feedback ? rules.goodLines : 0))
    issues.push("잘한 말 수가 설정을 넘는다");
  if (value.next_time_lines.length > (feedback ? rules.nextTimeLines : 0))
    issues.push("다음엔 이렇게 수가 설정을 넘는다");
  if (Array.from(value.summary).length > rules.summaryMaxChars)
    issues.push("요약이 글자 수를 넘는다");
  if (value.choices.length !== 0 && value.choices.length !== 2)
    issues.push("선택지가 0개나 2개가 아니다");
  if (
    !isLowBandLevel(input.level) &&
    (value.model_line !== "" || value.choices.length > 0)
  )
    issues.push("4단계부터 소리 줄이 비지 않았다");
  const item = cardItemIn(value.card_item, card);
  if (item.kind !== value.card_item.kind || item.no !== value.card_item.no)
    issues.push("카드 항목이 카드에 없다");
  if (value.next_move === "closing" && !turn.allChancesUsed)
    issues.push("카드 기회를 다 다루지 않은 턴의 갈래가 마무리다");
  const goals = allowedGoalsOf(input);
  if (
    value.goal_suggest.some((g) => !goals.has(g.goal)) ||
    value.next_goal.some((g) => !goals.has(g))
  )
    issues.push("목표 ID 가 카드 목표 · 이월 목표 밖이다");
  if (turn.input !== "speech" && value.mission_done.length > 0)
    issues.push("'모름' 턴에 미션 완료 제안이 있다");
  if (turn.closing && value.tori_en !== "")
    issues.push("끝맺음 턴의 tori_en 이 비지 않았다");
  if (!turn.closing && value.tori_en.trim() === "")
    issues.push("tori_en 이 비었다");
  return issues;
}

// ── 출력 검사 칸 · 걸린 칸 바꾸기(6.4) ─────────────────────────────

/** 소문자로 다듬을 열거값 칸(갈래 · 준 도움 · 카드 항목 종류). */
const ENUM_PATHS = ["next_move", "support", "card_item.kind"] as const;
/** 힌트 묶음(걸리면 묶음 전체를 비우고 카드 항목의 것으로, 카드 항목이 없으면 '힌트' 단추 없음 — 6.2 · C189). */
const HINT_PATHS = [
  "next_hint_ko",
  "next_hints",
  "next_usable_phrases",
  "next_answer_example",
] as const;
const FAREWELL_PATHS = ["farewell", "farewell_ko"] as const;

/**
 * 아이에게 보이거나 읽어 주는 칸과 부모가 읽는 칸(6.4 회화 턴 · 끝맺음 턴). tori_en 은 흘려 받는 동안 문장마다 본다(stream).
 * 길이: 아이가 말할 학습 글(따라 할 말 · 선택지 · 힌트 · 쓸 수 있는 말 · 답 예시 · 다음엔 이렇게)만 본다. 선생님 자신의 말(되풀이 ·
 * 끝인사)은 3.6 '길이 초과' 기록 대상이라 막지 않고, 잘한 말은 아이 말 인용이며, 근거 한 줄은 한국어 기록이다.
 */
export function talkLessonCheckFields(value: TalkLessonOutput): CheckField[] {
  const each = (
    path: string,
    lang: "en" | "ko",
    list: readonly string[],
    checkLength = true,
  ): CheckField[] =>
    list.map((text, i) => ({ path: `${path}.${i}`, lang, text, checkLength }));
  return [
    { path: "model_line", lang: "en", text: value.model_line },
    ...each("choices", "en", value.choices),
    { path: "tori_ko", lang: "ko", text: value.tori_ko },
    { path: "recast", lang: "en", text: value.recast, checkLength: false },
    { path: "explanation", lang: "ko", text: value.explanation },
    ...value.goal_suggest.map((g, i) => ({
      path: `goal_suggest.${i}.why_ko`,
      lang: "ko" as const,
      text: g.why_ko,
    })),
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

export type TalkLessonChecked = {
  value: TalkLessonOutput;
  changed: boolean;
  /** 힌트 묶음이 걸려 비웠다 — 출력이 가리킨 카드 항목의 힌트로, 카드 항목이 없으면 '힌트' 단추 없음. */
  hintsBlocked: boolean;
  /** 따라 할 말이 걸려 카드 들려줄 말 · 막힌 질문의 답 예시로 바꿨다. */
  modelLineReplaced: boolean;
  /** 선택지가 걸려 비웠다(질문만 남김). */
  choicesBlocked: boolean;
  /** 끝인사가 걸려 비웠다 — 카드 끝인사로. */
  farewellBlocked: boolean;
  /** 요약이 걸려 비웠다 — 저장하지 않는다. */
  summaryBlocked: boolean;
};

/**
 * 걸린 칸 바꾸기(6.4): 뜻은 전체 '' · 되풀이 · 설명 '' · 따라 할 말은 바꿀 글로 · 선택지는 비움 · 근거 한 줄이 걸린 제안은 뺌 ·
 * 잘한 말 · 다음엔 이렇게는 걸린 줄을 뺌 · 힌트 묶음 · 끝인사 묶음 · 요약은 비우고 알림.
 */
export function applyTalkLessonChecks(
  value: TalkLessonOutput,
  hits: ReadonlyMap<string, readonly FieldHit[]>,
  input: Pick<TalkLessonInput, "card" | "turn" | "lemmaOf" | "level">,
): TalkLessonChecked {
  if (hits.size === 0)
    return {
      value,
      changed: false,
      hintsBlocked: false,
      modelLineReplaced: false,
      choicesBlocked: false,
      farewellBlocked: false,
      summaryBlocked: false,
    };
  const hintsBlocked = HINT_PATHS.some((path) => hitUnder(hits, path));
  const modelLineReplaced = hitUnder(hits, "model_line");
  const choicesBlocked = hitUnder(hits, "choices");
  const farewellBlocked = FAREWELL_PATHS.some((path) => hitUnder(hits, path));
  const summaryBlocked = hitUnder(hits, "summary");
  const keep = <T>(path: string, list: readonly T[]) =>
    list.filter((_, i) => !hitUnder(hits, `${path}.${i}`));
  const modelLine = modelLineReplaced
    ? modelLineFallbackOf(
        { ...input, turn: chosenCallTurnOf(input.turn, value.stuck) },
        value.new_words,
      )
    : value.model_line;
  const choices = choicesBlocked ? [] : value.choices;
  return {
    value: {
      ...value,
      model_line: modelLine,
      choices,
      // 비운 따라 할 말 · 선택지에 남은 support 는 들은 도움을 잘못 세게 한다 — 정규화와 같은 규칙으로 다시 맞춘다('5-다' fix 2 재검토 F-1)
      support: supportOf(value.support, {
        low: isLowBandLevel(input.level),
        modelLine,
        choices,
      }),
      tori_ko: hitUnder(hits, "tori_ko") ? "" : value.tori_ko,
      recast: hitUnder(hits, "recast") ? "" : value.recast,
      explanation: hitUnder(hits, "explanation") ? "" : value.explanation,
      goal_suggest: keep("goal_suggest", value.goal_suggest),
      ...(hintsBlocked
        ? {
            next_hint_ko: "",
            next_hints: [],
            next_usable_phrases: [],
            next_answer_example: "",
          }
        : {}),
      ...(farewellBlocked ? { farewell: "", farewell_ko: "" } : {}),
      good_lines: keep("good_lines", value.good_lines),
      next_time_lines: keep("next_time_lines", value.next_time_lines),
      summary: summaryBlocked ? "" : value.summary,
    },
    changed: true,
    hintsBlocked,
    modelLineReplaced,
    choicesBlocked,
    farewellBlocked,
    summaryBlocked,
  };
}

// ── 호출 규격 둘(P9b CallSpec 꼴) ─────────────────────────────────

function talkLessonSpecFor(
  purpose: "talk_turn" | "talk_closing",
): CallSpec<TalkLessonInput, TalkLessonOutput, TalkLessonRules> {
  return {
    purpose,
    title: TALK_LESSON_TITLE,
    wireSchema: talkLessonWire,
    looseSchema: talkLessonLoose,
    multiTurn: true,
    enumPaths: ENUM_PATHS,
    settingSchemas: SETTING_SCHEMAS,
    rulesOf: talkLessonRulesOf,
    // 가림: 이번 아이 말과 지난 대화 요약. 앞 턴 전문은 가린 뒤 저장한 글이라 글자 그대로 둔다(캐시, 6.1)
    mask: (input, masker: Masker) => ({
      ...input,
      turn: { ...input.turn, child: masker(input.turn.child).text },
      summaries: input.summaries.map((s) => masker(s).text),
    }),
    system: talkLessonSystem,
    messages: (input) => talkLessonMessages(input),
    validate: talkLessonValidate,
    normalize: normalizeTalkLesson,
    checkFields: talkLessonCheckFields,
    applyChecks: (value, hits, input): ApplyChecksResult<TalkLessonOutput> => {
      const result = applyTalkLessonChecks(value, hits, input);
      // 회화 턴은 걸린 칸을 바꿔 쓰고 그 턴을 실패로 보지 않는다(6.4)
      return { value: result.value, changed: result.changed, fatal: false };
    },
  };
}

/** 회화 수업 턴(아이 말이 끝날 때마다, 흘려 보냄). */
export const talkLessonTurnSpec = talkLessonSpecFor("talk_turn");
/** 회화 수업 끝맺음 턴('그만하기' 응답 뒤, 같은 규격 · 같은 대화). */
export const talkLessonClosingSpec = talkLessonSpecFor("talk_closing");

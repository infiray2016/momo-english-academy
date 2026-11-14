// 회화 수업 새 흐름(C189 새 꼴 카드)이 함께 쓰는 형과 설정(회화 plan 묶음 5 — lesson-flow · chances · ending 이 이 파일을 읽는다).
// talk_turns 의 가벼운 꼴(아이 행 · 선생님 행 + move), 흐름이 읽는 카드 · 단계 규격 칸, 12절 talk.* 설정 읽기.
// 카드 형은 묶음 3 의 새 꼴 TalkCard 에서 흐름이 읽는 칸만 골라 둔다(TalkCard 는 이 형에 그대로 들어간다).
// 순수 모듈이다. 설정값이 없거나 꼴이 틀리면 던진다(조용한 기본값 없음).
import { z } from "zod";
import {
  TALK_LEAD_MODE_KEY,
  TALK_LEAD_MODES,
  type TalkLeadMode,
} from "@/core/conversation/lead-mode";
import type { TalkChildCause, TalkMove } from "@/core/conversation/move";
import type { TalkLevelSpec } from "@/core/seed/schema/reference";
import type { TalkCard, TalkRequired } from "@/core/seed/schema/talk";
import { type Band, TALK_LOW_BAND } from "@/core/seed/structure";

// ── talk_turns 가벼운 꼴 ─────────────────────────────────────────

// 토막 · 입력 방식 · 힌트 종류 · 들은 도움은 talk_turns 기록 칸이라 이 파일이 정한다. 회화 턴 규격(calls/talk-lesson.ts)이 가져와 다시 내보내고, 옛 talk.ts 는
// talk-lesson.ts 를 다시 내보낸다(회화 plan 묶음 '5-다' (가) — talk-lesson.ts 가 lesson-flow.ts 를 가져오므로 여기 두어야 순환이 없다).

/** 이 턴의 토막(6.2 — 인사 · 인사 끝 · 대화 · 더 이야기하기). 짧은 준비 · 정리는 AI 를 부르지 않는다. */
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
/** 들은 도움(5절 heard_help 열거 그대로 — 선택지는 two_answers, 따라 할 말 · 같이 말하기의 답 · 답 예시는 answer_example, 정한 것 8). */
export const TALK_HEARD_HELPS = [
  "none",
  "two_answers",
  "answer_example",
] as const;
export type TalkHeardHelp = (typeof TALK_HEARD_HELPS)[number];

/** 아이 행(talk_turns 아이 행 · 차례대로 — 선생님 행 n 뒤의 아이 말 n). */
export type TalkLessonChildTurn = {
  speaker: "child";
  segment: TalkTurnSegment;
  input: TalkInputMode;
  /** 막힘으로 볼 말(회화 턴 출력 stuck 참, C36). */
  stuck: boolean;
  /** '모름'의 출처가 말소리 없음(client_listen nospeech, C149 — 들리지 않음 차례). */
  nospeech: boolean;
  /** '한국어로 물어보기' 질문 턴(변경 단위 ⑤ 뒤). 말 주고받기 · 참여에 들지 않는다. */
  koQuestion?: boolean;
  /**
   * 되물은 아이 차례(talk_turns.ask_again 참 — 13절 C218, 5절 '되물음 표지'): 선생님이 못 알아들어 그 질문 자리에서 한 번 더 말해 달라고 한
   * 아이 말이다. 참인 행만 칸이 있다(빈 옛 행 · 거짓 행은 칸 없음). 이 칸을 읽는 흐름(자리 되짚기 · 셈)은 내용 고침 2 묶음 2-가 몫이다.
   */
  askAgain?: boolean;
  /** 이 턴이 노린 단원 단어(talk_turns.target_words). */
  targets: string[];
};

/** 선생님 행. text 는 화면에 글로 나온 줄뿐이다(정한 것 5 — 소리 줄 글은 move.sound). */
export type TalkLessonTeacherTurn = {
  speaker: "teacher";
  text: string;
  /** 차례 정보 칸(talk_turns.move). 옛 행 · 빈 칸이면 null. */
  move: TalkMove | null;
  /** 이 차례 질문의 답 예시(AI 질문이면 talk_turns.ai_question 의 답 예시, C101). 1~3단계 받침 첫째 소리 줄 재료. */
  answerExample?: string | null;
};

export type TalkLessonTurn = TalkLessonChildTurn | TalkLessonTeacherTurn;

/** 아이 차례의 까닭(말로 답했으면 null). 단추 · 막힘 말은 아이 쪽 막힘, 말소리 없음은 기기 쪽이다(3.3, C172 가). */
export function childCauseOf(
  row: Pick<TalkLessonChildTurn, "input" | "stuck" | "nospeech">,
): TalkChildCause | null {
  if (row.input === "dont_know") return row.nospeech ? "nospeech" : "button";
  return row.stuck ? "stuck" : null;
}

// ── 흐름이 읽는 카드 · 단계 규격 칸 ───────────────────────────────

/** 필수 질문 · 더 이야기할 거리 가운데 흐름이 읽는 칸. */
export type TalkLessonItem = Pick<
  TalkRequired,
  "no" | "en" | "ko" | "targets" | "goals" | "answerExample" | "easyQuestion"
>;
/** 새 꼴 카드 가운데 흐름이 읽는 칸(묶음 3 TalkCard 가 그대로 들어간다). */
export type TalkLessonCard = Pick<
  TalkCard,
  "greetingTurns" | "greeting" | "prep" | "missions"
> & {
  required: readonly TalkLessonItem[];
  more: readonly TalkLessonItem[];
};
/** 단계 규격 가운데 흐름이 읽는 칸. */
export type TalkLessonSpec = Pick<
  TalkLevelSpec,
  "band" | "targetTurns" | "koMeaning"
>;

/** 1~3단계 구간인가(카드 줄 · 소리 줄을 쓰는 단계, 6.3 TALK_LOW_BAND). */
export const isLowBand = (spec: Pick<TalkLessonSpec, "band">) =>
  spec.band === TALK_LOW_BAND;

// ── 설정(12절 talk.* · speech.*) ────────────────────────────────

export const TALK_PREP_MODES = ["always", "when_needed"] as const;
export type TalkPrepMode = (typeof TALK_PREP_MODES)[number];

export type TalkLessonSettings = {
  /** talk.dontknow_max — 같은 질문 자리의 이어진 막힘이 이만큼이면 그 자리를 닫는다. */
  dontknowMax: number;
  /** talk.floor_after_stuck — 바닥선 문턱(질문 자리와 관계없이 이어진 아이 쪽 막힘). */
  floorAfterStuck: number;
  /** talk.follow_child_turns — 따라가기 상한. */
  followChildTurns: number;
  /** talk.same_question_max — 한 대화에서 글이 같은 선생님 질문의 상한. */
  sameQuestionMax: number;
  /** talk.required_gap_turns — 돌아오기 알림 문턱. */
  requiredGapTurns: number;
  /** talk.reask_per_word — 새 단어마다 준비하는 다시 쓰기 기회 수(0 이면 다시 쓰기 기회 없음). */
  reaskPerWord: number;
  /**
   * talk.ask_again_max — 한 질문 자리에서 못 알아들은 말을 막힌 차례로 세기 전에 되묻는 횟수의 상한(13절 C218, 12절). 0 이면 되묻지 않고
   * 지금대로 바로 받침으로 간다(되돌림 스위치). 값을 바꾸는 길은 결정 기록 먼저다('C218 · C222 보완 2' (3)).
   */
  askAgainMax: number;
  /** talk.prep_offer_stuck — 4단계부터 대화 중 짧은 준비를 여는 막힌 차례 수. */
  prepOfferStuck: number;
  /** talk.more_talk_round_turns — '더 이야기하기' 한 번의 턴 수. */
  moreRoundTurns: number;
  /** speech.silent_items_max — 들리지 않음으로 닫힌 자리가 이만큼 이어지면 막힘 화면(C22). */
  silentItemsMax: number;
  /** talk.prep_words.<구간> — 짧은 준비 낱말 수. */
  prepWords: number;
  /** talk.prep_mode.<구간> — 짧은 준비를 늘 할지 · 필요할 때만 할지. */
  prepMode: TalkPrepMode;
  /**
   * talk.lead_mode — 회화 방식(회화 Claude 주도 묶음 M · 이야기 방식 묶음 C). 수업을 처음 열 때만 읽어 처음 스냅숏에 적는다. 진행 중 세션의 방식은
   * 이 값이 아니라 스냅숏(leadModeOf)이다. 값이 없거나 app · claude · chat 밖이면 다른 설정처럼 던진다(조용히 app 으로 바꾸지 않음 — 실험 값 오타가
   * A 로 도는 것을 막음).
   */
  leadMode: TalkLeadMode;
  /** 이야기 방식(talk.lead_mode chat)이 읽는 talk.chat_* (12절, 이야기 방식 spec 설정 표). 세 방식 모두 늘 읽는다(키가 빠진 DB 는 다른 키처럼 드러남). */
  chat: TalkChatSettings;
};

/**
 * 이야기 방식 설정(12절 talk.chat_* — 이야기 방식 spec 판 3 설정 표 · 설계 2 · 6 · 7 · 8-2 · 11, 값은 잠정). 이야기 방식은 1~3단계 구간에서만 돌므로
 * 낱말 수는 그 구간 키 하나만 둔다(talk.chat_turn_words.1-3 — 다른 구간은 행이 없다).
 */
export type TalkChatSettings = {
  /** talk.chat_turn_words.1-3 — 안내문 '말하는 범위'의 한 차례 낱말 수. */
  turnWords: number;
  /** talk.chat_quiet_seconds — 아이 차례가 열리고 읽기가 끝난 뒤 입력 없이 기다리는 시간(초). 0 이면 조용함 입구를 보내지 않는다(끔). */
  quietSeconds: number;
  /** talk.chat_teacher_run_max — 조용함으로 선생님이 혼자 잇달아 말하는 차례 수의 상한. */
  teacherRunMax: number;
  /** talk.chat_hint_context_turns — 힌트 호출에 싣는 앞 대화 차례 수(선생님 · 아이 합침). */
  hintContextTurns: number;
  /** talk.chat_hint_retry_max — 힌트 호출이 실패한 뒤 선생님 행당 다시 받기 수의 상한(0 이면 다시 받지 않음). */
  hintRetryMax: number;
  /** talk.chat_eval_context_turns — 평가 호출에 싣는 아이 차례 앞의 대화 차례 수(선생님 · 아이 합침). */
  evalContextTurns: number;
  /** talk.chat_alternatives — 이야기 방식 듣기의 maxAlternatives. */
  alternatives: number;
  /** talk.chat_unsure_confidence — 인식기 알림을 붙이는 확신 정도 문턱(0~1). */
  unsureConfidence: number;
  /** talk.chat_unsure_on_partial — 아이 말 글이 중간 결과만으로 끝났을 때 인식기 알림을 붙일지(첫 판은 거짓). */
  unsureOnPartial: boolean;
  /** talk.chat_explain_wait_seconds — 막힌 뒤 설명을 기다리는 차례에서 조용함 타이머가 설명을 기다리는 상한(초). */
  explainWaitSeconds: number;
  /** talk.chat_day_part_hours — 수업 시작 사실의 morning · afternoon · evening 경계 시각(0~23 정수, 오름차순 셋). */
  dayPartHours: readonly [number, number, number];
};

/** 이야기 방식 설정 키(12절). 칸 이름 → 키. */
export const TALK_CHAT_KEYS = {
  turnWords: "talk.chat_turn_words.1-3",
  quietSeconds: "talk.chat_quiet_seconds",
  teacherRunMax: "talk.chat_teacher_run_max",
  hintContextTurns: "talk.chat_hint_context_turns",
  hintRetryMax: "talk.chat_hint_retry_max",
  evalContextTurns: "talk.chat_eval_context_turns",
  alternatives: "talk.chat_alternatives",
  unsureConfidence: "talk.chat_unsure_confidence",
  unsureOnPartial: "talk.chat_unsure_on_partial",
  explainWaitSeconds: "talk.chat_explain_wait_seconds",
  dayPartHours: "talk.chat_day_part_hours",
} as const satisfies Record<keyof TalkChatSettings, string>;

/** 하루 시각(0~23 정수). */
const HOUR_SCHEMA = z.int().min(0).max(23);

const POSITIVE_KEYS = {
  dontknowMax: "talk.dontknow_max",
  floorAfterStuck: "talk.floor_after_stuck",
  followChildTurns: "talk.follow_child_turns",
  sameQuestionMax: "talk.same_question_max",
  requiredGapTurns: "talk.required_gap_turns",
  prepOfferStuck: "talk.prep_offer_stuck",
  moreRoundTurns: "talk.more_talk_round_turns",
  silentItemsMax: "speech.silent_items_max",
} as const;
const REASK_KEY = "talk.reask_per_word";
const ASK_AGAIN_KEY = "talk.ask_again_max";
const PREP_WORDS_KEY = "talk.prep_words";
const PREP_MODE_KEY = "talk.prep_mode";

function readValue<T>(
  read: (key: string) => unknown,
  key: string,
  schema: z.ZodType<T>,
  what: string,
): T {
  const parsed = schema.safeParse(read(key));
  if (!parsed.success)
    throw new Error(`회화 설정 '${key}' 가 없거나 ${what}가 아니다`);
  return parsed.data;
}

/** 회화 수업 흐름 설정을 읽는다(구간 키는 그 단계 구간 값). */
export function talkLessonSettingsFrom(
  read: (key: string) => unknown,
  band: Band,
): TalkLessonSettings {
  const positive = z.int().min(1);
  const out = {} as Record<keyof typeof POSITIVE_KEYS, number>;
  for (const [name, key] of Object.entries(POSITIVE_KEYS) as [
    keyof typeof POSITIVE_KEYS,
    string,
  ][])
    out[name] = readValue(read, key, positive, "1 이상 정수");
  return {
    ...out,
    reaskPerWord: readValue(read, REASK_KEY, z.int().min(0), "0 이상 정수"),
    askAgainMax: readValue(read, ASK_AGAIN_KEY, z.int().min(0), "0 이상 정수"),
    prepWords: readValue(
      read,
      `${PREP_WORDS_KEY}.${band}`,
      positive,
      "1 이상 정수",
    ),
    prepMode: readValue(
      read,
      `${PREP_MODE_KEY}.${band}`,
      z.enum(TALK_PREP_MODES),
      "always · when_needed",
    ),
    leadMode: readValue(
      read,
      TALK_LEAD_MODE_KEY,
      z.enum(TALK_LEAD_MODES),
      TALK_LEAD_MODES.join(" · "),
    ),
    chat: talkChatSettingsFrom(read),
  };
}

/** 이야기 방식 설정을 읽는다(talkLessonSettingsFrom 이 부른다 — 구간과 관계없이 같은 키). 없거나 꼴이 틀리면 던진다. */
function talkChatSettingsFrom(
  read: (key: string) => unknown,
): TalkChatSettings {
  const k = TALK_CHAT_KEYS;
  const positive = z.int().min(1);
  const count = z.int().min(0);
  const seconds = z.number().min(0);
  return {
    turnWords: readValue(read, k.turnWords, positive, "1 이상 정수"),
    quietSeconds: readValue(read, k.quietSeconds, seconds, "0 이상 수"),
    teacherRunMax: readValue(read, k.teacherRunMax, positive, "1 이상 정수"),
    hintContextTurns: readValue(
      read,
      k.hintContextTurns,
      positive,
      "1 이상 정수",
    ),
    hintRetryMax: readValue(read, k.hintRetryMax, count, "0 이상 정수"),
    evalContextTurns: readValue(
      read,
      k.evalContextTurns,
      positive,
      "1 이상 정수",
    ),
    alternatives: readValue(read, k.alternatives, positive, "1 이상 정수"),
    unsureConfidence: readValue(
      read,
      k.unsureConfidence,
      z.number().min(0).max(1),
      "0~1 사이 수",
    ),
    unsureOnPartial: readValue(read, k.unsureOnPartial, z.boolean(), "참거짓"),
    explainWaitSeconds: readValue(
      read,
      k.explainWaitSeconds,
      seconds,
      "0 이상 수",
    ),
    dayPartHours: readValue(
      read,
      k.dayPartHours,
      z
        .tuple([HOUR_SCHEMA, HOUR_SCHEMA, HOUR_SCHEMA])
        .refine(([a, b, c]) => a < b && b < c),
      "오름차순 시각 셋",
    ),
  };
}

// 회화 구조 비교 실험(13절 C234 · task-exp-harness · task-exp-arm-p): 선생님 쪽 다섯 방식(A · B · C · C2 · P)과 아이 역(K1 · K2 · K3)이 번갈아 말하는 연속 수업.
// 사용: node --env-file-if-exists=.env.local --import tsx scripts/exp/arch-compare.ts --out <폴더> [--pilot] [--turns 16]
//        [--children K1,K2,K3 | SA,SB,SC,SD,SD2,SE,SF,SG] [--seeds 1,2] [--arms A,B,C,C2,P,N,Q,QP,R,R2,R3,R3M,R3O,CHAT]
//        [--card replay|lesson1] [--long [--long-turns 40] [--long-safety-max 40]] [--call --max-calls <수>]
// 같은 (아이 · 씨앗)의 네 방식은 동시에, 조합 사이는 차례로 돈다. 실패한 수업은 그 수업만 다시 돈다(두 번까지, 기록에 남김).
// 방식 A 는 앱 코드 그대로(scripts/talk-observe.ts createTalkSim — 프롬프트 조립 · 차례 계획 · 응답 검사 · 다시 쓰기 · 카드 자리 · 고정 문구).
// 방식 B 는 같은 시스템 프롬프트 · 출력 규격 · 기록 꼴에 사용자 메시지의 행동 지시 줄을 걷고(arch-arms B_REMOVED_PREFIXES) 후처리를 하지
// 않는다(검사는 기록만). 방식 C · C2 는 브리프의 틀(arch-arms cSystemOf · c2SystemOf)과 say · say_ko 출력뿐이다. 방식 P 는 C 와 같은 길에
// 시제품의 짧은 안내문 · 일곱 칸 출력 · 차례마다 상태 알림(arch-arm-p)을 쓴다(후처리 없음). 방식 N 은 앱에 구현된 새 엔진의 길(scripts/talk-observe.ts
// createTalkSim 에 talk.lead_mode claude — 서버 턴 길과 같은 core 함수, 회화 Claude 주도 묶음 X2)이다. A · N 은 앱의 마무리 차례에서 아이 역이
// '더 이야기하기'를 고르면 앱처럼 잇는다(A: 카드 자리 한 줄, N: 아이 말 없이 부르는 입구 more).
// 방식 Q · QP(Q+)는 제안 구조의 시제품(13절 C242 · task-x3 — arch-arm-q): 짧은 안내문 · 네 칸 출력 · 아이 입력 줄뿐(상태 알림 없음) · 후처리 없음,
// wrap_up 이 참이면 다음 아이 차례 앞에서 두 단추를 내고 '더 이야기하기'면 그 메시지로 잇는다. 아이 역 SA~SF 는 요청자가 정한 여섯 상황이다
// (--children SA,SB,SC,SD,SE,SF — 잡음은 SC · SD 에만, arch-arms childHasNoise).
// 결과 폴더에 앞 실행의 setup.json · run-summary.json 이 있으면 덮지 않고 합친다(공통 재료가 다르면 멈춤).
// 키 값은 출력하지 않는다. 결과 파일: <out>/runs/<방식>-<아이>-s<씨앗>.jsonl · .transcript.md, <out>/run-summary.json.
// 방식 CHAT(묶음 T2)은 앱 길의 이야기 방식(대본 도구 runChatScenario — 서버와 같은 함수, talk.lead_mode chat)에 아이 역 AI 가 차례마다 말을 정하고
// 앱 행동(조용함 · 말 없음 · 힌트 · 모름 · 더 이야기하기 · 인식기 알림)을 넣는다(spec '회화 대화 구조 R' 설계 13). --card lesson1 은 실제 카드(회화 3단계
// 단원 1 첫 수업, 짧은 준비가 열림), --long 은 긴 대본 한 벌(CHAT · SE · 아이 차례 40)을 더한다.
// 실제 AI 호출은 --call 과 --max-calls <수> 가 함께 있을 때만 나간다(13절 C243 보완 5 (6)). 기본은 계획만: 수업 · 방식 · 호출 갈래별 위쪽 어림 수와
// 어림 비용을 찍고 끝낸다. 어림이 상한을 넘으면 부르지 않고, 실행 중 상한에 닿으면 더 부르지 않고 멈춘다.
import { createHash } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type Anthropic from "@anthropic-ai/sdk";
import { APIError } from "@anthropic-ai/sdk";
import type { z } from "zod";
import { TALK_CHAT_EVAL_SYSTEM } from "../../src/core/ai/calls/talk-chat-eval";
import {
  type TalkChatHintInput,
  talkChatHintSpec,
  talkChatHintSystem,
} from "../../src/core/ai/calls/talk-chat-hint";
import {
  choicesLine,
  holdsQuestionSentence,
  isLowBandLevel,
  type TalkCallTurn,
  type TalkLessonContext,
  type TalkLessonInput,
  type TalkLessonOutput,
  type TalkLessonRules,
  talkLessonCheckFields,
  talkLessonContextDelta,
  talkLessonRewriteOf,
  talkLessonTurnSpec,
  talkLessonUserMessage,
  talkLineOptionsOf,
  talkSceneWordsOf,
} from "../../src/core/ai/calls/talk-lesson";
import { requestConfigOf } from "../../src/core/ai/combo";
import { billedAttemptsOf, costOf, formatUsd6 } from "../../src/core/ai/cost";
import { createMasker } from "../../src/core/ai/mask";
import { checkOutputFields } from "../../src/core/ai/output-check";
import { buildAiRequest } from "../../src/core/ai/request";
import { startPrepWordsOf } from "../../src/core/conversation/chances";
import { chatHintReplyOf } from "../../src/core/conversation/chat-hints";
import {
  type ChatDayPartHours,
  chatClockOf,
} from "../../src/core/conversation/chat-message";
import { heardHintsOf } from "../../src/core/conversation/heard-hint";
import {
  type LeadCandidateTable,
  leadCandidateTableOf,
} from "../../src/core/conversation/lead-candidate";
import { TALK_LEAD_MODE_KEY } from "../../src/core/conversation/lead-mode";
import { talkLessonSettingsFrom } from "../../src/core/conversation/lesson-turns";
import {
  checkLowLevelQuestion,
  type LowLevelLineOptions,
} from "../../src/core/conversation/question-check";
import { metWordsIn } from "../../src/core/conversation/said";
import { normalizeSpoken } from "../../src/core/conversation/spoken";
import {
  createToriSentenceGate,
  isQuestionSentence,
  safeLineOf,
  TORI_EN_KEY,
} from "../../src/core/conversation/stream";
import { LevelSpecsFileSchema } from "../../src/core/seed/schema/reference";
import { bandOf } from "../../src/core/seed/structure";
import { splitSentences, tokenize } from "../../src/core/seed/text";
import {
  SAMPLE_CONTACT_PATTERNS,
  SAMPLE_NAMES,
} from "../../tests/fixtures/ai/sample-inputs";
import {
  createScriptClient,
  loadScriptConfig,
  readApiKey,
  type ScriptConfig,
  withFormat,
} from "../ai-contract";
import {
  type CallResult,
  CHAT_CALL_KINDS,
  type ChatCallCounts,
  type ChatCaller,
  type ChatCallKind,
  type ChatScenarioRun,
  type ChatScenarioTurn,
  createTalkSim,
  evaluateLessonMessage,
  type LeadSimEntry,
  type LeadTurnRecord,
  type Materials,
  materialsOf,
  type ObserveScript,
  type ObserveStep,
  parseObserveScript,
  readScriptFiles,
  readSeedFiles,
  runChatScenario,
  runValuesOf,
  type TalkSim,
  type TurnRecord,
} from "../talk-observe";
import {
  P_SYSTEM,
  P_UNIT_WORDS,
  POutputSchema,
  pChildMessageOf,
  pStatusOf,
} from "./arch-arm-p";
import {
  isQArm,
  Q_ARMS,
  Q_MORE_MESSAGE,
  type QArm,
  QOutputSchema,
  qCallOverrideOf,
  qChildMessageOf,
  qSystemOf,
  type R2LessonContext,
  r2LessonContextOf,
  r2StartMessageOf,
  type SttNote,
  usesLessonFacts,
} from "./arch-arm-q";
import {
  C_START_MESSAGE,
  CHAT_LOW_CONFIDENCE,
  type ChatHeardSegment,
  type ChatHintShown,
  type ChildAction,
  type ChildKey,
  type ChildOutput,
  ChildOutputSchema,
  COutputSchema,
  c2SystemOf,
  cChildMessageOf,
  chatChildMessageOf,
  chatForcedPickOf,
  chatHintTurnOf,
  chatRecognizerOf,
  chatSilentInputOf,
  childHasNoise,
  childSystemOf,
  cSystemOf,
  heardByChild,
  levelLineOf,
  missingSafetySentences,
  SCENARIO_CHILDREN,
  splitDirectiveLines,
  WRAP_PICKS,
  WrapChildOutputSchema,
  type WrapPick,
  wrapChoiceMessageOf,
} from "./arch-arms";
import {
  createFirstSentenceClock,
  type FirstSent,
  type FirstSentence,
  flat,
  lessonEndingOf,
  levelFitOf,
  type PlanCalls,
  planCallsCostUsdOf,
  type SpeechField,
  sentenceDiffOf,
  TEACHER_CLOSING_REASON,
  TEACHER_WRAP_REASON,
} from "./arch-metrics";
import { isNoiseTurn, type NoiseResult, noiseOf } from "./arch-noise";

export const ARMS = [
  "A",
  "B",
  "C",
  "C2",
  "P",
  "N",
  "Q",
  "QP",
  "R",
  "R2",
  "R3",
  "R3M",
  "R3O",
  "CHAT",
] as const;
export type Arm = (typeof ARMS)[number];
/** 앱 길의 이야기 방식(talk.lead_mode chat — 묶음 T2). 다른 방식 이름과 겹치지 않는다. */
export const CHAT_ARM = "CHAT" as const satisfies Arm;
/** 긴 대본 한 벌의 아이 차례(spec 설계 13 '긴 대본 한 벌'). */
export const CHAT_LONG_TURNS = 40;
/** 긴 대본의 바탕 아이 역(SE)과 씨앗. */
export const CHAT_LONG_CHILD = "SE" as const satisfies ChildKey;
export const CHAT_LONG_SEED = 1;
/** --children 를 주지 않을 때의 아이 역(지난 실험 그대로). */
export const CHILDREN = [
  "K1",
  "K2",
  "K3",
] as const satisfies readonly ChildKey[];
/** --children 로 고를 수 있는 아이 역 전부(K1~K3 + 시나리오 SA~SF). */
export const ALL_CHILDREN = [
  ...CHILDREN,
  ...SCENARIO_CHILDREN,
] as const satisfies readonly ChildKey[];
export const SEEDS = [1, 2] as const;
/** 3단계 자리 재현 대본(2026-11-08 실제 수업 — 회화 3단계 단원 1 수업 6 · 미나). 카드 · 선생님을 이 대본에서 읽는다. */
export const SOURCE_SCRIPT = "replay-lesson-1108";
export const FULL_TURNS = 16;
export const PILOT_TURNS = 8;
/** 실패한 수업을 다시 도는 횟수 상한. */
const RERUN_MAX = 2;
/** 앱이 쓰는 PURPOSE(회화 턴). */
const PURPOSE = "talk_turn" as const;

export function lessonName(
  arm: Arm,
  child: ChildKey,
  seed: number,
  variant?: "long",
): string {
  return `${arm}-${child}-s${seed}${variant === "long" ? "-long" : ""}`;
}

// ── 기록 꼴 ────────────────────────────────────────────────────

export type RequestLog = {
  model: unknown;
  system: unknown;
  messages: unknown;
  thinking: unknown;
  output_config: unknown;
  max_tokens: unknown;
  cache_control?: unknown;
  fallbacks?: unknown;
  betas: string[];
};

export type CallLog = {
  type: "call";
  lesson: string;
  childTurn: number;
  /**
   * turn: 선생님 턴(CHAT 은 대화 호출) · rewrite: 앱의 다시 쓰기(N 은 좁은 정의 다시 말하기) · child: 아이 역(그 밖) · hint · explain · eval: CHAT 의
   * 힌트 · 막힌 뒤 설명 · 기록 전용 평가 호출(옛 기록에는 없다).
   */
  kind: "turn" | "rewrite" | "child" | "hint" | "explain" | "eval";
  request: RequestLog;
  response: {
    ok: boolean;
    text?: string;
    stop_reason?: string | null;
    model?: string;
    usage?: {
      input: number;
      output: number;
      cacheRead: number;
      cacheWrite: number;
    };
    costUsd?: number;
    error?: string;
  };
  ms: number;
  /** 흘려 받은 선생님 호출(A · P · N · Q · QP)의 첫 문장 시각(spec '회화 Claude 주도' 설계 9). 아이 역 호출 · 옛 기록에는 없다. */
  firstSentence?: FirstSentence;
};

export type Branch =
  | "그대로 나감"
  | "질문을 다시 쓰게 함"
  | "카드의 질문으로 바꿈"
  | "고정 문구를 붙임"
  | "모델의 문장을 지움"
  | "모델을 부르지 않은 고정 차례";

export type TeacherTurnLog = {
  type: "teacher_turn";
  lesson: string;
  arm: Arm;
  /** 이 선생님 말 앞의 아이 차례 번호(0 = 수업 처음). */
  childTurn: number;
  called: boolean;
  /** 모델이 처음 쓴 응답(필드 그대로 — 읽지 못했으면 원문 글). */
  modelFirst: unknown;
  /** 모델이 처음 쓴 말을 소리로 낸 꼴(A · B: tori_en + model_line + 선택지 줄, C: say). */
  modelFirstSpoken: string | null;
  /** A: 앱이 넘긴 이번 차례의 지시(사용자 메시지에서 B 가 걷는 줄). B: B 가 걷은 줄. C · P: null. */
  directive: string[] | null;
  /** P: 이 차례 사용자 메시지에 붙인 상태 알림(사실만). 다른 방식은 없음. */
  status?: string;
  /** A: 앱 검사 · 흐름 결과. B: 기록만 한 검사(A 였다면 걸렸을 것). */
  checks: unknown;
  retry: {
    kind: string;
    note: string;
    fail: unknown;
    output: unknown;
    spoken: string | null;
    outcome: string | null;
  } | null;
  /** 최종 말과 모델이 처음(과 다시 쓴) 말의 문장 차이. */
  changes: { deleted: string[]; added: string[] };
  /** 아이에게 나간 최종 영어({NAME} 은 앱 꼴 그대로). */
  final: string;
  branches: Branch[];
  levelFit: ReturnType<typeof levelFitOf>;
  calls: number;
  ms: number;
  /** 첫 호출 하나가 끝난 시간(ms). */
  firstMs: number | null;
  /** 첫 호출에서 아이에게 나갈 말의 첫 문장이 끝난 시각(A · P, 부르지 않은 차례는 null). 옛 기록에는 없다. */
  firstSentence?: FirstSentence | null;
  /**
   * 아이에게 첫 문장이 실제로 나간 때(A · P · N 같은 뜻 — 검토 rev-x1 M5 · rev-s1 M-2, 정의는 arch-metrics FirstSent). 앱이 받아 둔 차례(held)는
   * 받아 둔 응답이 끝난 때(본 호출 + 다시 쓰기 · 다시 말하기 호출)다. 부르지 않은 차례 · B · C · C2 · 옛 기록에는 없다.
   */
  firstSent?: FirstSent | null;
  /** 마무리 차례에서 아이 역이 '더 이야기하기'를 고른 뒤 이은 선생님 차례(A: 카드 자리 한 줄, N: 입구 more). childTurn 은 그 뒤 아이 차례 번호다. */
  afterChoice?: true;
  /** N: 새 엔진 차례의 기록(입구 start 를 접은 인사 끝 차례는 그 입구의 기록). 다른 방식 · 옛 기록에는 없다. */
  lead?: LeadTurnLog;
  /**
   * N: 인사 끝 차례에 접은 입구 start 호출(검토 rev-x2 M-4). 실제 앱에서는 두 호출 사이에 짧은 준비가 있어 아이가 이어 기다리는 시간이 아니므로,
   * 이 차례의 calls · ms 에 더하지 않고 여기 따로 둔다. firstSent 는 대화 토막에 들어와 첫 소리를 듣기까지(A 에는 없는 N 만의 기다림)다.
   */
  entryStart?: {
    calls: number;
    ms: number;
    firstSent: FirstSent | null;
    /** 접기 전 인사 끝 차례의 말과 입구 start 의 말(아이 역에게 그 사이 짧은 준비 쪽지 줄을 넣는 재료 — T2 fix 1 m-2). 옛 기록에는 없다. */
    before?: string;
    said?: string;
  };
  ended?: string;
  /** CHAT: 이야기 방식 차례의 기록(대본 도구 차례 기록을 줄인 것). 다른 방식 · 옛 기록에는 없다. */
  chat?: ChatTeacherLog;
};

/**
 * CHAT 선생님 차례 하나(대본 도구 ChatScenarioTurn · ChatTurnRecord 에서 셀 것만): 입구 · 끝 갈래 · 사실 줄 · 끝 줄 신호 · 응답의 wrap_up(거짓으로
 * 다룬 자리) · 따라 할 문장 대조 · 지어낸 경험 꼴 · 안전 상한으로 닫음 · 사용량 · 이 차례 호출 갈래별 수(앞 아이 차례의 힌트 누름 · 뒤 평가 · 설명
 * 포함) · 비용.
 */
export type ChatTeacherLog = {
  entry: "child" | "start" | "back" | "more" | "quiet";
  turnEnd: string | null;
  facts: string[];
  signal: {
    quietSeconds?: number;
    hint?: true;
    explainWait?: number;
    alternatives?: number;
  } | null;
  wrapUp: boolean;
  wrapUpHeld: string | null;
  listen: { sentence: string; inSay: boolean; partial?: true } | null;
  /** 1~3단계에서 보이는 글에서 빼 소리 줄로 낸 문장(move.chat.removed). */
  removed: string[];
  /**
   * 응답 say 의 첫 문장이 소리 줄로 빠진 차례(따라 할 문장 · 막힌 뒤 고르기 물음 — fix 1 m-6): 첫 문장 시간은 say 의 첫 문장으로 재므로 이 차례는 아이가
   * 들은 첫 문장보다 이르게 잰다. 첫 문장 시간 수치는 이 차례를 넣은 값과 뺀 값을 함께 낸다.
   */
  firstMoved: boolean;
  madeUp: string[];
  closed: boolean;
  failure: string | null;
  diverged: boolean;
  usage: {
    firstSentenceMs: number | null;
    inputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    outputTokens: number;
    costUsd: number;
    latencyMs: number;
  } | null;
  calls: ChatCallCounts;
  costUsd: number;
  waitedMs: number;
  hints: { tier: number; retry: number; called: boolean; ok: boolean }[];
  explain: { called: boolean; ok: boolean } | null;
  evals: { status: string; called: boolean }[];
};

/** CHAT 아이 차례의 앱 행동(턴 요청에 실은 입력 · 누른 힌트 단 · 아이 역이 본 힌트 글 · 인식기 정보 · 선생님이 기다리기만 한 차례). */
export type ChatChildLog = {
  input: "say" | "dont_know" | "nospeech" | "quiet";
  hintTier: number;
  hint: ChatHintShown | null;
  recognizer: { confidence?: number | null; alternative?: string } | null;
  waited: boolean;
};

/** N 한 차례의 기록(차이 표 · 좁은 정의 · 받아 둔 차례 · 마무리 막힘 셈의 재료 — 회화 Claude 주도 설계 5 · 6 · 9). */
export type LeadTurnLog = {
  entry: "child" | "start" | "more";
  reading: string | null;
  move: string | null;
  /** 선생님 행 move.kind(ai · first_question · closing_slot). */
  kind: string;
  closing: boolean;
  closingAdded: boolean;
  /** 마무리 차례인데 그 아이 말의 읽기가 막힘(reading: 응답 읽기 칸 · effective: 지금 무름 뒤 — 검토 rev-s1 M-4). */
  closingStuck: { reading: boolean; effective: boolean };
  /** 받아 둔 차례: 말 칸 전체(say) · 첫 문장부터 물음(question). */
  held: "say" | "question" | null;
  narrow: LeadTurnRecord["narrow"];
  /** move.lead.gate 전체(문장 문 걸림 · 받아 둔 표지 held_say · held_question · 힌트 막음 — 셈은 이름으로 가른다, 검토 rev-s1 M-3). */
  gate: string[];
  removed: string[];
  soundMoved: boolean;
  sound: { model?: string; answer?: string };
  /** 나간 말 칸(문장 문 · 다시 말하기 뒤 — 1~3단계에서 소리로 뺀 문장 포함)과 모델이 처음 쓴 말 칸. */
  say: string;
  rawSay: string | null;
  failure: string | null;
  /** 본 호출 · 다시 말하기 호출의 시간(ms). */
  ms: number;
  retryMs: number | null;
  child: LeadTurnRecord["child"];
  explanation: string | null;
};

export type ChildTurnLog = {
  type: "child_turn";
  lesson: string;
  childTurn: number;
  /** 아이 역이 들은 선생님 말(최종 영어, {NAME} → friend). */
  heardTeacher: string;
  action: ChildAction;
  says: string;
  kind: ChildOutput["kind"];
  why: string;
  /** 선생님 쪽에 넘긴 들린 글(speak 만). */
  heard: string | null;
  noise: NoiseResult | null;
  /** 잡음 차례인데 speak 가 아니라 건너뜀. */
  noiseSkipped: boolean;
  /** 음성 인식기의 알림(실험에서 만든 값 — 방식 R2 의 선생님 호출에만 실었고, 그때만 남긴다). */
  stt?: SttNote;
  /** CHAT: 앱 행동(턴 요청에 실은 입력 · 힌트 · 인식기 정보). */
  chat?: ChatChildLog;
};

export type LessonLog = {
  type: "lesson";
  lesson: string;
  arm: Arm;
  child: ChildKey;
  seed: number;
  turnsAsked: number;
  childTurns: number;
  ended: string | null;
  attempt: number;
  failures: string[];
  startedAt: string;
  finishedAt: string;
  /** 수업이 끝난 길 · 마무리 차례의 말 · 고른 단추. 옛 기록에는 없다(arch-report endingOf 가 ended 글로 정한다). */
  ending?: LessonEnding;
  /** N: 수업마다 지금 판정과 새 후보 판정의 차이 표(core leadCandidateTableOf — 설계 5 · 미결 7). 다른 방식에는 없다. */
  lead?: { table: LeadCandidateTable };
  /** 이 수업에 잘못 들린 글(잡음)을 지금 일정으로 넣었는가(아이 역으로 정함 — arch-arms childHasNoise). 옛 기록에는 없다(그때는 모두 넣음). */
  noise?: boolean;
  /**
   * 이 실행이 쓴 앱 재료의 표지(검토 rev-x2 I-1): 1~3단계 상황 차례 답 글 검사의 기능어 수(서버처럼 어휘 시드의 품사 칸에서 읽음). 옛 기록에는
   * 없다(그때의 A 는 이 집합이 비어 있었다).
   */
  materials?: { functionWords: number };
  /** 긴 대본 한 벌(CHAT 만 — 시나리오 셈에서 빼고 따로 읽는다). */
  variant?: "long";
  /**
   * CHAT: 수업 호출 갈래별 수 · 비용, 정리의 되짚을 말(카드 정리 대사인가), 짧은 준비 쪽지 낱말, 이 수업만 덮은 설정값, 수업 시작 맥락(R3 와 같은
   * 요일 · 때 · 만남 수).
   */
  chat?: {
    calls: ChatCallCounts;
    costUsd: number;
    wrap: { en: string; card: boolean }[];
    prepWords: string[];
    overrides: Record<string, unknown>;
    start: R2LessonContext;
    /** 아이가 '그만하기'를 골라 정리 토막에 닿았다(옛 기록에는 없다 — 없으면 닿지 않음으로 읽는다). */
    reachedWrap?: boolean;
  };
};

/** 앱의 마무리 차례(마무리 물음 · 마무리 제안)에서 아이 역이 고른 단추. */
export type WrapChoice = {
  /** 이 아이 차례 앞에서 골랐다. */
  childTurn: number;
  /** closing: 앱의 마무리 물음 · suggestion: 앱의 마무리 제안 · wrap_up: 방식 Q · QP 의 선생님이 wrap_up 참으로 마무리를 꺼냄. */
  kind: "closing" | "suggestion" | "wrap_up";
  /** 마무리 차례의 말(아이에게 나간 최종 영어). */
  line: string;
  picked: WrapPick;
  /** 아이 역이 함께 낸 말 · 까닭(기록만 — 선생님 쪽에 넘기지 않는다). */
  says: string;
  why: string;
  /** '더 이야기하기' 뒤 수업을 이었는가(도구가 그 방식의 이음 길을 가졌을 때만 true). */
  continued: boolean;
};

export type LessonEnding = {
  /** app_closing: 앱의 마무리 차례(고르기 · 닫힘) · teacher_closing: 선생님이 스스로 마무리함 · turn_cap: 아이 차례 상한 · other: 그 밖(실패 등). */
  how: "app_closing" | "teacher_closing" | "turn_cap" | "other";
  /** 끝날 때까지 지난 아이 차례 수. */
  childTurns: number;
  /** 마무리 차례의 말(마지막 선생님 최종 영어). 아이 차례 상한이면 null. */
  line: string | null;
  /** 앱 · 도구가 적은 까닭 글(LessonLog.ended 와 같은 글). */
  reason: string | null;
  choices: WrapChoice[];
};

export type LogLine = CallLog | TeacherTurnLog | ChildTurnLog | LessonLog;

// ── 호출 ──────────────────────────────────────────────────────

export type Req = {
  body: Record<string, unknown>;
  betas: string[];
  timeoutMs: number;
};

class CallFailure extends Error {}

/** 실행 전체의 실제 호출 수 상한(--max-calls). left 는 남은 호출 수다(호출 하나를 부르기 전에 줄인다). */
export type CallBudget = { left: number };

/** 상한에 닿아 부르지 않은 오류의 글 머리(이 오류로 실패한 수업은 다시 돌리지 않고 실행을 멈춘다). */
export const CALL_CAP_ERROR = "호출 수 상한에 닿아 부르지 않음";

export function isCapError(message: string): boolean {
  return message.includes(CALL_CAP_ERROR);
}

function requestLogOf(req: Req): RequestLog {
  const b = req.body;
  return {
    model: b.model,
    system: b.system,
    messages: b.messages,
    thinking: b.thinking,
    output_config: b.output_config,
    max_tokens: b.max_tokens,
    ...(b.cache_control !== undefined
      ? { cache_control: b.cache_control }
      : {}),
    ...(b.fallbacks !== undefined ? { fallbacks: b.fallbacks } : {}),
    betas: [...req.betas],
  };
}

type Ctx = {
  client: Anthropic;
  book: ScriptConfig["book"];
  log: (line: LogLine) => void;
  /** 실행 전체의 호출 수 상한(없으면 상한 없음 — 시험 · 옛 길). */
  budget?: CallBudget;
};

/**
 * 흘려 받기 시도 하나(talk-observe streamTurn 과 같은 길 — 베타 stream · maxRetries 0). 네 방식 · 아이 역 모두 이 함수로 부른다.
 * speech 를 주면(선생님 호출 A · P) 조각마다 그 말 칸을 흘려 읽어 첫 문장이 끝난 시각을 적는다(호출이 끝난 시간 ms 는 그대로).
 */
async function send(
  ctx: Ctx,
  req: Req,
  meta: { lesson: string; childTurn: number; kind: CallLog["kind"] },
  speech?: SpeechField,
): Promise<{
  result: CallResult & { ok: true };
  text: string;
  ms: number;
  firstSentence: FirstSentence | null;
}> {
  if (ctx.budget !== undefined) {
    if (ctx.budget.left <= 0)
      throw new CallFailure(
        `${meta.lesson} 아이 차례 ${meta.childTurn} ${meta.kind}: ${CALL_CAP_ERROR}`,
      );
    ctx.budget.left -= 1;
  }
  const started = Date.now();
  const clock = speech ? createFirstSentenceClock(speech, Date.now) : null;
  const stream = ctx.client.beta.messages.stream(
    {
      ...req.body,
      ...(req.betas.length > 0 ? { betas: req.betas } : {}),
    } as never,
    { timeout: req.timeoutMs },
  );
  if (clock) stream.on("text", (delta: string) => clock.text(delta));
  try {
    const message = (await stream.finalMessage()) as unknown as Extract<
      CallResult,
      { ok: true }
    >["message"];
    const ms = Date.now() - started;
    const text = (message.content as readonly { type: string; text?: string }[])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
    const firstSentence = clock ? clock.done(ms, text) : null;
    const model = String(req.body.model);
    const cost = costOf(billedAttemptsOf(message, model), ctx.book);
    ctx.log({
      type: "call",
      ...meta,
      request: requestLogOf(req),
      response: {
        ok: true,
        text,
        stop_reason: message.stop_reason ?? null,
        model: message.model,
        usage: {
          input: cost.tokens.input,
          output: cost.tokens.output,
          cacheRead: cost.tokens.cacheRead,
          cacheWrite: cost.tokens.cacheWrite,
        },
        costUsd: Number(formatUsd6(cost.costMicros)),
      },
      ms,
      ...(firstSentence ? { firstSentence } : {}),
    });
    return {
      result: {
        ok: true,
        message,
        latencyMs: ms,
        // talk-observe streamTurn 과 같은 뜻(흘려 읽은 때만, 아니면 null)
        firstSentenceMs:
          firstSentence?.from === "stream" ? firstSentence.ms : null,
        requestId: stream.request_id ?? "",
      },
      text,
      ms,
      firstSentence,
    };
  } catch (error) {
    const ms = Date.now() - started;
    const detail =
      error instanceof APIError
        ? `${error.status ?? 0} ${(error.error as { error?: { type?: string; message?: string } } | undefined)?.error?.type ?? error.constructor.name} ${((error.error as { error?: { message?: string } } | undefined)?.error?.message ?? "").slice(0, 200)}`
        : error instanceof Error
          ? `${error.name}: ${error.message.slice(0, 200)}`
          : "Error";
    ctx.log({
      type: "call",
      ...meta,
      request: requestLogOf(req),
      response: { ok: false, error: detail },
      ms,
    });
    throw new CallFailure(
      `${meta.lesson} 아이 차례 ${meta.childTurn} ${meta.kind} 호출 실패: ${detail}`,
    );
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** A · B 응답 필드를 소리로 낸 꼴(tori_en → model_line → 선택지 줄, 서버 lessonAfterLinesOf 차례 — 앱이 붙이는 줄은 없이). */
export function spokenOfLessonOutput(raw: unknown): string | null {
  if (raw === null || typeof raw !== "object") return null;
  const o = raw as {
    tori_en?: unknown;
    model_line?: unknown;
    choices?: unknown;
    farewell?: unknown;
  };
  const tori = typeof o.tori_en === "string" ? o.tori_en.trim() : "";
  const model = typeof o.model_line === "string" ? o.model_line.trim() : "";
  const choices =
    Array.isArray(o.choices) &&
    o.choices.length === 2 &&
    o.choices.every((c) => typeof c === "string" && c.trim() !== "")
      ? choicesLine(o.choices as string[])
      : "";
  const farewell = typeof o.farewell === "string" ? o.farewell.trim() : "";
  return [tori === "" ? farewell : tori, model, choices]
    .filter((l) => l !== "")
    .join("\n");
}

// ── 공통 재료 ────────────────────────────────────────────────────

/** 실험 재료의 카드: replay 는 지난 실험의 재생 대본(회화 3단계 단원 1 수업 6 — 짧은 준비 없음), lesson1 은 실제 카드 첫 수업(짧은 준비가 열림). */
export const SETUP_CARDS = ["replay", "lesson1"] as const;
export type SetupCard = (typeof SETUP_CARDS)[number];

/**
 * 실제 카드 첫 수업의 대본 틀(spec 설계 13 '재료는 실제 카드(seed/lessons/talk/3/1.json 첫 수업)'): 재료를 읽는 자리(단계 · 단원 · 수업 · 선생님)만
 * 쓰고 차례는 쓰지 않는다. 덮는 설정값 · 건너뛴 준비 낱말 · 지난 요약은 없다(새 아이).
 */
export const CHAT_CARD_SCRIPT: ObserveScript = {
  name: "exp-chat-l3u1-lesson1",
  title: "3단계 · 실제 카드 첫 수업(이야기 방식 실험 재료)",
  level: 3,
  unit: 1,
  lesson: 1,
  teacher: "mina",
  steps: [{ say: "I'm fine." }],
};

export type Setup = {
  root: string;
  /** 실험 재료의 카드(지난 실험은 replay). */
  card: SetupCard;
  config: ScriptConfig;
  script: ObserveScript;
  materials: Materials;
  values: Record<string, unknown>;
  rules: TalkLessonRules;
  /** A 의 첫 턴 요청(본문 틀 — 모델 · max_tokens · thinking · effort · 규격 · 캐시 · 머리글). */
  template: Req;
  /** A 의 시스템 프롬프트(첫 턴). */
  appSystem: string;
  /** 앱 첫 인사(고정 차례, 앱 화면 글). */
  opening: string;
  /** 첫 사용자 메시지의 앱 첫 말(sim openingLine 과 같은 꼴). */
  openingLine: string;
  /** 인사 끝 뒤 앱이 붙이는 대화 첫 질문(앱 흐름 그대로). */
  firstQuestion: string;
  /** 인사 끝 턴의 다음 토막(앱 흐름 그대로). */
  nextPart: "prep" | "talk" | undefined;
  /** 짧은 준비 낱말(앱 계획 그대로). */
  prepPlan: string[];
  cSystem: string;
  c2System: string;
  /** 방식 P 시스템(시제품 글 그대로). */
  pSystem: string;
  /** 시제품의 낱말 목록이 앱 재료의 단원 단어(C2 가 쓰는 목록)와 순서까지 같은가. */
  pWordsSameAsUnit: boolean;
  /** 방식 N 의 안내문(대화 첫 차례 요청의 system — 앱 talkLeadSystem 그대로). 새 엔진을 열 수 없는 단원이면 null. */
  nSystem: string | null;
  /** 방식 Q · QP 의 안내문(arch-arm-q qSystemOf — 선생님 이름 · 단원 낱말은 N 과 같은 재료 값). */
  qSystems: Record<QArm, string>;
  /** 방식 CHAT 의 안내문(입구 start 요청의 system — 앱 talkChatTurnSpec 그대로). 이야기 방식을 열 수 없는 단원이면 null. */
  chatSystem: string | null;
  masker: ReturnType<typeof createMasker>;
  sentenceMax: number;
};

/** 앱과 같은 가림(talk-observe 의 masker 와 같은 재료). */
function maskerOf() {
  return createMasker({
    names: SAMPLE_NAMES,
    isVocabWord: () => false,
    contactPatterns: SAMPLE_CONTACT_PATTERNS,
  });
}

/** 인사 끝 뒤 앱이 붙이는 대화 첫 질문을 앱 흐름으로 얻는다(버리는 sim 에 짜 맞춘 응답 하나를 넣고 appAfter 를 읽는다 — AI 를 부르지 않음). */
function firstQuestionOf(
  materials: Materials,
  values: Record<string, unknown>,
  book: ScriptConfig["book"],
): string {
  const sim = createTalkSim(materials, values, book, { rotationKey: "probe" });
  const ready = sim.prepare({ say: "I'm fine." }, 0);
  if (!ready.ok) throw new Error(`첫 질문 얻기 실패: ${ready.reason}`);
  const text = JSON.stringify({
    child_kind: "answer",
    stuck: false,
    tori_en: "Good to hear!",
  });
  const record = sim.finish(ready.turn, {
    ok: true,
    message: {
      model: "probe",
      stop_reason: "end_turn",
      usage: { input_tokens: 0, output_tokens: 0 },
      content: [{ type: "text", text }],
    } as never,
    latencyMs: 0,
    firstSentenceMs: null,
    requestId: "",
  });
  return record.appAfter.join("\n").trim();
}

/** 방식 N 의 안내문: 버리는 N 대본 도구로 인사를 지금 길로 마치고(짜 맞춘 응답 — AI 를 부르지 않음) 입구 start 의 요청 system 을 읽는다. */
function nSystemOf(
  materials: Materials,
  values: Record<string, unknown>,
  book: ScriptConfig["book"],
): string | null {
  const sim = createTalkSim(
    materials,
    { ...values, [TALK_LEAD_MODE_KEY]: "claude" },
    book,
    { rotationKey: "probe" },
  );
  if (!sim.lead.on) return null;
  const text = JSON.stringify({
    child_kind: "answer",
    stuck: false,
    tori_en: "Good to hear!",
  });
  for (let i = 0; i < 4 && !sim.lead.applies(); i++) {
    const ready = sim.prepare({ say: "I'm fine." }, i);
    if (!ready.ok) return null;
    sim.finish(ready.turn, {
      ok: true,
      message: {
        model: "probe",
        stop_reason: "end_turn",
        usage: { input_tokens: 0, output_tokens: 0 },
        content: [{ type: "text", text }],
      } as never,
      latencyMs: 0,
      firstSentenceMs: null,
      requestId: "",
    });
  }
  const opened = sim.lead.prepare({ kind: "open", open: "start" });
  return opened.ok ? String(opened.turn.request.body.system) : null;
}

/** 방식 CHAT 의 안내문: 버리는 이야기 방식 대본 도구로 입구 start 요청의 system 을 읽는다(AI 를 부르지 않음). */
function chatSystemOf(
  materials: Materials,
  values: Record<string, unknown>,
  book: ScriptConfig["book"],
): string | null {
  const sim = createTalkSim(
    materials,
    { ...values, [TALK_LEAD_MODE_KEY]: "chat" },
    book,
    { rotationKey: "probe" },
  );
  if (!sim.chat.on) return null;
  const opened = sim.chat.prepare({ kind: "open", open: "start" });
  return opened.ok ? String(opened.turn.request.body.system) : null;
}

function sourceScriptOf(root: string, card: SetupCard): ObserveScript {
  if (card === "lesson1") return CHAT_CARD_SCRIPT;
  const scriptFile = readScriptFiles(root).find(
    (f) => f.file === `${SOURCE_SCRIPT}.json`,
  );
  if (!scriptFile) throw new Error(`대본 없음: ${SOURCE_SCRIPT}`);
  const parsed = parseObserveScript(scriptFile.raw, scriptFile.file);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.script;
}

export function setupOf(root: string, opts: { card?: SetupCard } = {}): Setup {
  const card = opts.card ?? "replay";
  const config = loadScriptConfig({ root });
  const script = sourceScriptOf(root, card);
  const { values } = runValuesOf({
    values: config.values,
    level: script.level,
    effort: null,
    script,
    set: {},
  });
  const m = materialsOf(readSeedFiles(root, script.level, script.unit), script);
  if (!m.ok) throw new Error(m.missing);
  const materials = m.materials;
  const sim = createTalkSim(materials, values, config.book, {
    rotationKey: "template",
  });
  const opening = sim.rows
    .flatMap((r) => (r.speaker === "tori" ? [r.text.trim()] : []))
    .join("\n");
  const openingRow = sim.rows.find((r) => r.speaker === "tori");
  const openingLine =
    openingRow?.speaker === "tori"
      ? openingRow.rewrite
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l !== "")
          .join(" ")
      : opening;
  const first = sim.prepare({ say: "I'm fine." }, 0);
  if (!first.ok) throw new Error(`틀 요청 실패: ${first.reason}`);
  const template: Req = {
    body: first.turn.request.body,
    betas: first.turn.request.betas,
    timeoutMs: first.turn.request.timeoutMs,
  };
  const appSystem = String(template.body.system);
  const missing = missingSafetySentences(appSystem);
  if (missing.length > 0)
    throw new Error(`안전 문장이 앱 프롬프트에 없음: ${missing.join(" | ")}`);
  const specs = LevelSpecsFileSchema.parse(
    JSON.parse(readFileSync(join(root, "seed", "level-specs.json"), "utf8")),
  ).levelSpecs.filter((s) => s.area === "talk");
  const levelSpec = specs.find((s) => s.level === materials.level);
  const nextSpec = specs.find((s) => s.level === materials.level + 1);
  const maxLevel = Math.max(...specs.map((s) => s.level));
  const cInput = {
    teacherName: materials.teacher.nameEn,
    teacherPersona: materials.teacher.personaEn,
    levelLine: levelLineOf({
      level: materials.level,
      maxLevel,
      cefr: String((levelSpec as { cefr?: string } | undefined)?.cefr ?? "-"),
      nextCefr:
        (nextSpec as { cefr?: string } | undefined)?.cefr === undefined
          ? null
          : String((nextSpec as { cefr?: string }).cefr),
    }),
  };
  const settings = talkLessonSettingsFrom(
    (k) => values[k],
    bandOf(materials.level),
  );
  const prepPlan =
    settings.prepMode === "always"
      ? startPrepWordsOf({
          card: materials.card,
          carryWords: [],
          unitWords: materials.newWords,
          known: [],
          count: settings.prepWords,
        })
      : [];
  return {
    root,
    card,
    config,
    script,
    materials,
    values,
    rules: first.turn.rules,
    template,
    appSystem,
    opening,
    openingLine,
    firstQuestion: firstQuestionOf(materials, values, config.book),
    nextPart: first.turn.turn.nextPart,
    prepPlan: [...prepPlan],
    cSystem: cSystemOf(cInput),
    c2System: c2SystemOf(cInput, {
      topic: materials.card.topic,
      pattern: materials.ctx.learningElement,
      words: materials.ctx.unitWords,
    }),
    pSystem: P_SYSTEM,
    nSystem: nSystemOf(materials, values, config.book),
    qSystems: Object.fromEntries(
      Q_ARMS.map((arm) => [
        arm,
        qSystemOf({
          teacherName: materials.teacher.nameEn,
          unitWords: materials.ctx.unitWords,
          arm,
        }),
      ]),
    ) as Record<QArm, string>,
    chatSystem: chatSystemOf(materials, values, config.book),
    pWordsSameAsUnit:
      JSON.stringify([...P_UNIT_WORDS]) ===
      JSON.stringify([...materials.ctx.unitWords]),
    masker: maskerOf(),
    sentenceMax: first.turn.rules.teacherSentencesMax,
  };
}

/** 단계에 맞는 말 검사 재료(앱 talkLineOptionsOf — 아이가 이 수업에서 말한 낱말까지). */
function lineOptionsOf(
  setup: Setup,
  childWords: readonly string[],
): LowLevelLineOptions {
  const m = setup.materials;
  return talkLineOptionsOf({
    sentenceMaxWords: m.ctx.sentenceMaxWords,
    unitWords: m.ctx.unitWords,
    teacher: m.teacher,
    lineRange: {
      allowedWords: m.allowedWords,
      forms: m.forms,
      allowedForms: m.allowedForms,
      childWords: [...childWords],
      reaskWords: [],
    },
    lemmaOf: m.lemmaOf,
    homophones: m.homophones,
  });
}

function levelFitFor(
  setup: Setup,
  text: string,
  childWords: readonly string[],
) {
  return levelFitOf(text, lineOptionsOf(setup, childWords), setup.sentenceMax, {
    allowed: new Set(setup.materials.talkLists.allowed.allowed),
    expand: true,
    allowedLemmaOf: setup.materials.allowedLemmaOf,
  });
}

function wordsOf(text: string): string[] {
  return tokenize(text)
    .filter((t) => t.kind === "word")
    .map((t) => t.text.toLowerCase());
}

// ── 선생님 쪽 ────────────────────────────────────────────────────

export type ChildInput = {
  action: ChildAction;
  heard: string | null;
  /** 음성 인식기의 알림(실험에서 만든 값 — 방식 R2 만 선생님 호출에 싣는다). */
  stt?: SttNote | null;
};

/**
 * 실험에서 만드는 인식기 알림(R2 에만 전함): 말 전체가 바뀐 잡음의 첫째는 '확신 없음 + 다른 후보(아이가 하려던 말)', 둘째는 '확신 없음'만, 셋째는
 * 알림 없음(인식기가 틀린 글을 확신함). 낱말 하나만 바뀐 잡음에는 알림이 없다. 잡음을 넣는 아이 역의 깨끗한 차례 하나(아이 차례 6)에는 '확신 없음'을
 * 붙인다(맞게 들은 말에 붙는 알림 — 지나치게 되묻지 않는지 본다).
 */
export function sttNoteOf(input: {
  noise: NoiseResult | null;
  injectedBefore: number;
  says: string;
  noiseOn: boolean;
  childTurn: number;
}): SttNote | null {
  if (input.noise !== null) {
    if (input.noise.how !== "replace") return null;
    const k = input.injectedBefore % 3;
    if (k === 0) return { unsure: true, alt: input.says };
    if (k === 1) return { unsure: true };
    return null;
  }
  return input.noiseOn && input.childTurn === 6 ? { unsure: true } : null;
}

export type { WrapPick };
// 마무리 차례의 두 단추 · 아이 역 출력 · 안내 말은 방식 정의(arch-arms)로 옮겼다(arch-report 의 확인 항목 6 이 같은 글을 쓴다). 여기서 다시 내보낸다.
export { WRAP_PICKS, WrapChildOutputSchema, wrapChoiceMessageOf };

type TeacherOut = Omit<TeacherTurnLog, "type" | "lesson" | "arm" | "levelFit">;

/** 아이 차례 앞에서 앱이 수업을 멈춘 까닭(A 의 마무리 고르기 · 닫힘). choice 는 두 단추가 나온 고르기 차례일 때만. */
export type StopBefore = {
  reason: string;
  choice: WrapChoice["kind"] | null;
};

/** 대본 도구(createTalkSim prepare)가 멈춘 까닭 글에서 고르기 차례의 갈래를 읽는다(마무리 물음 · 마무리 제안, 그 밖은 null). */
export function wrapChoiceKindOf(reason: string): WrapChoice["kind"] | null {
  if (!reason.startsWith("고르기 차례")) return null;
  if (reason.includes("마무리 물음")) return "closing";
  if (reason.includes("마무리 제안")) return "suggestion";
  return null;
}

type Teacher = {
  open(): Promise<TeacherOut>;
  /** 아이 차례 앞에서 수업이 스스로 끝났는가(A 의 마무리 물음 · 닫힘). */
  endedBefore(childTurn: number): StopBefore | null;
  respond(childTurn: number, input: ChildInput): Promise<TeacherOut>;
  /**
   * 마무리 차례에서 '더 이야기하기'를 고른 뒤 앱처럼 잇는다(A · N 만 — 서버 chooseLessonMoreTalk). 이은 선생님 차례(afterChoice), 이을 수 없으면
   * null(그 자리에서 끝남). childTurn 은 그 뒤 아이 차례 번호다.
   */
  more?(childTurn: number): Promise<TeacherOut | null>;
  /** 수업이 끝난 뒤의 기록(N: 차이 표). */
  summary?(): LessonLog["lead"];
};

function sha(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/** 방식 A 의 대본 도구(앱 흐름 그대로 — 지난 실험과 같은 선택 값). N 은 같은 값에 talk.lead_mode claude 만 더한다. */
function simOf(
  setup: Setup,
  lesson: string,
  values: Record<string, unknown> = setup.values,
): TalkSim {
  return createTalkSim(setup.materials, values, setup.config.book, {
    skippedPrep: setup.script.prep?.skipped ?? [],
    summaries: setup.script.summaries ?? [],
    rotationKey: lesson,
  });
}

/**
 * 아이에게 첫 문장이 실제로 나간 때(검토 rev-x1 M5): A 는 1~3단계 첫 문장이 물음이면 앱이 응답 끝까지 받아 두고(talk-lesson holdsQuestionSentence),
 * 막힘을 무른 질문 차례는 통째로 다시 쓰게 해 받아 둔다(retryOf 의 rewrite). 받아 둔 차례는 본 호출 + 다시 쓰기 호출이 끝난 때다.
 */
export function appFirstSentOf({
  level,
  first,
  firstMs,
  retryKind,
  retryMs,
}: {
  level: number;
  first: FirstSentence | null;
  firstMs: number;
  retryKind: "question" | "rewrite" | null;
  retryMs: number | null;
}): FirstSent | null {
  const held =
    retryKind === "rewrite"
      ? "rewrite"
      : isLowBandLevel(level) &&
          first?.text != null &&
          holdsQuestionSentence(level, first.text)
        ? "question"
        : null;
  if (held !== null)
    return {
      ms: firstMs + (retryMs ?? 0),
      from: "end",
      text: first?.text ?? null,
      held,
    };
  return first === null
    ? null
    : { ms: first.ms, from: first.from, text: first.text, held: null };
}

/** 방식 A: 앱 코드 그대로(createTalkSim · retryOf · finish). */
function teacherA(setup: Setup, ctx: Ctx, lesson: string): Teacher {
  return appTeacher(setup, ctx, lesson, simOf(setup, lesson));
}

/** 지금 방식의 선생님(A · N 의 인사 토막): 대본 도구의 지금 길(prepare · retryOf · finish)과 '더 이야기하기'(chooseMore). */
function appTeacher(
  setup: Setup,
  ctx: Ctx,
  lesson: string,
  sim: TalkSim,
): Teacher {
  const reqConfig = requestConfigOf({
    purpose: PURPOSE,
    level: setup.materials.level,
    values: setup.values,
    book: setup.config.book,
  });
  const masker = maskerOf();
  /** A 의 요청이 앱 조립 함수(buildAiRequest + talkLessonTurnSpec)에서 나온 그대로인지 다시 만들어 견준다. */
  const assembledByApp = (
    input: TalkLessonInput,
    body: Record<string, unknown>,
  ) => {
    const again = buildAiRequest(talkLessonTurnSpec, input, {
      config: reqConfig,
      masker,
      rules: setup.rules,
    });
    return (
      again.body.system === body.system &&
      JSON.stringify(again.body.messages) === JSON.stringify(body.messages)
    );
  };
  return {
    async open() {
      return {
        childTurn: 0,
        called: false,
        modelFirst: null,
        modelFirstSpoken: null,
        directive: null,
        checks: null,
        retry: null,
        changes: { deleted: [], added: [] },
        final: setup.opening,
        branches: ["모델을 부르지 않은 고정 차례"],
        calls: 0,
        ms: 0,
        firstMs: null,
      };
    },
    endedBefore(childTurn) {
      const probe = sim.prepare({ input: "dont_know" }, childTurn - 1);
      if (probe.ok) return null;
      return probe.reason.startsWith("대화가 닫혔다") ||
        probe.reason.startsWith("고르기 차례")
        ? { reason: probe.reason, choice: wrapChoiceKindOf(probe.reason) }
        : null;
    },
    async respond(childTurn, input) {
      const step: ObserveStep =
        input.action === "speak" && input.heard
          ? { say: input.heard }
          : input.action === "silent"
            ? { input: "nospeech" }
            : { input: "dont_know" };
      const ready = sim.prepare(step, childTurn - 1);
      if (!ready.ok)
        return {
          childTurn,
          called: false,
          modelFirst: null,
          modelFirstSpoken: null,
          directive: null,
          checks: null,
          retry: null,
          changes: { deleted: [], added: [] },
          final: "",
          branches: [],
          calls: 0,
          ms: 0,
          firstMs: null,
          ended: ready.reason,
        };
      const turnReq: Req = {
        body: ready.turn.request.body,
        betas: ready.turn.request.betas,
        timeoutMs: ready.turn.request.timeoutMs,
      };
      const fromApp = assembledByApp(ready.turn.input, ready.turn.request.body);
      const first = await send(
        ctx,
        turnReq,
        { lesson, childTurn, kind: "turn" },
        TORI_EN_KEY,
      );
      const ask = sim.retryOf(ready.turn, first.result);
      const again = ask
        ? await send(
            ctx,
            {
              body: ask.request.body,
              betas: ask.request.betas,
              timeoutMs: ask.request.timeoutMs,
            },
            { lesson, childTurn, kind: "rewrite" },
            TORI_EN_KEY,
          )
        : null;
      const record: TurnRecord = sim.finish(
        ready.turn,
        first.result,
        ask && again ? { ask, result: again.result } : undefined,
      );
      const firstRaw = parseJson(first.text);
      const firstSpoken = spokenOfLessonOutput(firstRaw);
      const againRaw = again ? parseJson(again.text) : null;
      const againSpoken = again ? spokenOfLessonOutput(againRaw) : null;
      const cueEn = record.cue?.en;
      const attachNoCue = record.attach.slice(record.cue ? 1 : 0);
      const final = [
        record.teacher,
        cueEn,
        record.sound.model,
        record.sound.choices ? choicesLine(record.sound.choices) : undefined,
        record.sound.answer,
        ...attachNoCue,
        ...record.appAfter,
      ]
        .filter((l): l is string => typeof l === "string" && l.trim() !== "")
        .map((l) => l.trim())
        .join("\n");
      const changes = sentenceDiffOf(
        [firstSpoken ?? "", againSpoken ?? ""],
        final,
      );
      const branches: Branch[] = [];
      if (record.reask) branches.push("질문을 다시 쓰게 함");
      if (record.replaced !== null) branches.push("카드의 질문으로 바꿈");
      if (changes.added.length > 0) branches.push("고정 문구를 붙임");
      // 지움: 앱이 지운 문장(record.dropped)이 있거나, 다시 쓰기 없이 모델 문장이 최종 말에서 빠졌다(다시 쓰기를 이은 턴의 빠진 문장은 다시 쓰기 갈래)
      if (record.dropped.length > 0 || (!again && changes.deleted.length > 0))
        branches.push("모델의 문장을 지움");
      if (branches.length === 0) branches.push("그대로 나감");
      return {
        childTurn,
        called: true,
        modelFirst: firstRaw ?? first.text,
        modelFirstSpoken: firstSpoken,
        directive: splitDirectiveLines(ready.turn.userMessage).removed,
        checks: {
          assembledByApp: fromApp,
          plan: record.plan,
          move: record.move,
          flags: record.flags,
          replaced: record.replaced,
          dropped: record.dropped,
          situationLines: record.situationLines,
          sameQuestion: record.sameQuestion,
          stuck: record.stuck,
          checkHits: record.usage?.checkHits ?? null,
          failure: record.failure,
          cue: record.cue ?? null,
          sound: record.sound,
          attach: record.attach,
          appAfter: record.appAfter,
          childKind: record.childKind,
          userMessageSha: sha(ready.turn.userMessage),
        },
        retry:
          ask && again
            ? {
                kind: ask.kind,
                note: ask.note,
                fail: ask.fail,
                output: againRaw ?? again.text,
                spoken: againSpoken,
                outcome: record.reask?.outcome ?? null,
              }
            : null,
        changes,
        final,
        branches,
        calls: again ? 2 : 1,
        ms: first.ms + (again?.ms ?? 0),
        firstMs: first.ms,
        firstSentence: first.firstSentence,
        firstSent: appFirstSentOf({
          level: setup.materials.level,
          first: first.firstSentence,
          firstMs: first.ms,
          retryKind: ask && again ? ask.kind : null,
          retryMs: again?.ms ?? null,
        }),
      };
    },
    async more(childTurn) {
      // 서버 chooseLessonMoreTalk 의 지금 방식: 더 이야기할 거리 하나를 카드 자리 행으로 붙인다(AI 를 부르지 않음)
      const chosen = sim.chooseMore();
      if (!chosen.ok || chosen.mode !== "app") return null;
      return {
        childTurn,
        called: false,
        modelFirst: null,
        modelFirstSpoken: null,
        directive: null,
        checks: null,
        retry: null,
        changes: { deleted: [], added: [] },
        final: chosen.line.en,
        branches: ["모델을 부르지 않은 고정 차례"],
        calls: 0,
        ms: 0,
        firstMs: null,
        afterChoice: true,
      };
    },
  };
}

const notCalled = (childTurn: number, ended: string): TeacherOut => ({
  childTurn,
  called: false,
  modelFirst: null,
  modelFirstSpoken: null,
  directive: null,
  checks: null,
  retry: null,
  changes: { deleted: [], added: [] },
  final: "",
  branches: [],
  calls: 0,
  ms: 0,
  firstMs: null,
  ended,
});

/** 대본 차례(아이 역 입력 → 대본 도구 차례 꼴). */
function stepOfInput(input: ChildInput): ObserveStep {
  return input.action === "speak" && input.heard
    ? { say: input.heard }
    : input.action === "silent"
      ? { input: "nospeech" }
      : { input: "dont_know" };
}

/**
 * 방식 N: 앱에 구현된 새 엔진의 길(대본 도구 createTalkSim 에 talk.lead_mode claude — 회화 Claude 주도 묶음 X2). 인사 토막은 지금 길(A 와 같은
 * 함수)이고, 인사 끝 뒤 대화 첫 차례는 아이 말 없이 부르는 입구 start 로 Claude 가 쓴다(서버처럼 그 인사 끝 차례 뒤에 이어 들림 — 이 기록에서는
 * 인사 끝 선생님 차례에 접어 final 을 잇고 lead 에 입구 기록을 둔다). 대화 · 더 이야기하기 토막의 차례는 새 엔진 길(lead.prepare · retryOf ·
 * finish — 요청은 서버 턴 길과 같은 core 함수, 좁은 정의 다시 말하기는 한 번)이다. 마무리 차례에서 '더 이야기하기'를 고르면 입구 more 로 잇는다.
 */
function teacherN(setup: Setup, ctx: Ctx, lesson: string): Teacher {
  const sim = simOf(setup, lesson, {
    ...setup.values,
    [TALK_LEAD_MODE_KEY]: "claude",
  });
  if (!sim.lead.on)
    throw new Error(
      `${lesson}: 새 엔진 세션이 아니다(안내문 글이 있는 1~3단계 단원인지 확인)`,
    );
  const app = appTeacher(setup, ctx, lesson, sim);
  const leadCall = async (
    childTurn: number,
    entry: LeadSimEntry,
  ): Promise<TeacherOut> => {
    const ready = sim.lead.prepare(entry);
    if (!ready.ok) return notCalled(childTurn, ready.reason);
    const reqOf = (r: {
      body: Record<string, unknown>;
      betas: string[];
      timeoutMs: number;
    }): Req => ({
      body: r.body,
      betas: r.betas,
      timeoutMs: r.timeoutMs,
    });
    const first = await send(
      ctx,
      reqOf(ready.turn.request),
      { lesson, childTurn, kind: "turn" },
      "say",
    );
    const ask = sim.lead.retryOf(ready.turn, first.result);
    // 좁은 정의 다시 말하기(서버는 흘려 받지 않는 runAiCall — 첫 문장 시각을 재지 않는다)
    const again = ask
      ? await send(ctx, reqOf(ask.request), {
          lesson,
          childTurn,
          kind: "rewrite",
        })
      : null;
    const rec = sim.lead.finish(
      ready.turn,
      first.result,
      ask && again ? { ask, result: again.result } : undefined,
    );
    const rawSay =
      typeof (rec.raw as { say?: unknown } | null)?.say === "string"
        ? (rec.raw as { say: string }).say.trim()
        : null;
    const retrySpoken = again
      ? (() => {
          const q = (parseJson(again.text) as { question?: unknown } | null)
            ?.question;
          return typeof q === "string" ? q : null;
        })()
      : null;
    const final = rec.heard;
    const changes = sentenceDiffOf([rawSay ?? "", retrySpoken ?? ""], final);
    const branches: Branch[] = [];
    if (rec.narrow?.retry) branches.push("질문을 다시 쓰게 함");
    if (changes.added.length > 0) branches.push("고정 문구를 붙임");
    if (!again && changes.deleted.length > 0)
      branches.push("모델의 문장을 지움");
    if (branches.length === 0) branches.push("그대로 나감");
    const lead = rec.teacher.move.lead;
    const firstSent: FirstSent | null =
      rec.held !== null
        ? {
            ms: first.ms + (again?.ms ?? 0),
            from: "end",
            text:
              rec.lines.flatMap((l) => (l.t === "s" ? [l.en] : []))[0] ?? null,
            held: rec.held,
          }
        : first.firstSentence
          ? {
              ms: first.firstSentence.ms,
              from: first.firstSentence.from,
              text: first.firstSentence.text,
              held: null,
            }
          : null;
    return {
      childTurn,
      called: true,
      modelFirst: rec.raw ?? first.text,
      modelFirstSpoken: rawSay,
      directive: null,
      status: rec.userMessage,
      checks: null,
      retry:
        ask && again
          ? {
              kind: "narrow",
              note: ask.prompt,
              fail: ask.target,
              output: parseJson(again.text) ?? again.text,
              spoken: retrySpoken,
              outcome: rec.narrow
                ? rec.narrow.retry
                  ? `다시 받은 질문이 그 자리에 나감${rec.narrow.again ? "(다시 걸림 — 그대로 나감)" : ""}`
                  : "받는 조건을 지나지 못해 원래 질문이 나감"
                : null,
            }
          : null,
      changes,
      final,
      branches,
      calls: again ? 2 : 1,
      ms: first.ms + (again?.ms ?? 0),
      firstMs: first.ms,
      firstSentence: first.firstSentence,
      firstSent,
      lead: {
        entry: rec.entry,
        reading: lead?.reading ?? null,
        move: lead?.move ?? null,
        kind: rec.teacher.move.kind,
        closing: rec.closing,
        closingAdded: lead?.closingAdded === true,
        closingStuck: rec.closingStuck,
        held: rec.held,
        narrow: rec.narrow,
        gate: [...(lead?.gate ?? [])],
        removed: [...(lead?.removed ?? [])],
        soundMoved: lead?.soundMoved === true,
        sound: { ...(rec.teacher.move.sound ?? {}) },
        say: (() => {
          try {
            const say = (
              JSON.parse(rec.teacher.toriRewrite ?? "{}") as { say?: unknown }
            ).say;
            return typeof say === "string" ? say : rec.teacher.text;
          } catch {
            return rec.teacher.text;
          }
        })(),
        rawSay,
        failure: rec.failure,
        ms: first.ms,
        retryMs: again?.ms ?? null,
        child: rec.child,
        explanation: rec.teacher.explanation,
      },
    };
  };
  return {
    open: () => app.open(),
    endedBefore() {
      const stop = sim.stopBefore();
      return stop === null
        ? null
        : { reason: stop.reason, choice: stop.choice };
    },
    async respond(childTurn, input) {
      if (sim.lead.applies())
        return leadCall(childTurn, {
          kind: "child",
          step: stepOfInput(input),
          stepIndex: childTurn - 1,
        });
      // 인사 토막(지금 길). 인사 끝 뒤 대화 첫 질문 차례가 열리면 입구 start 를 이어 부르고 그 차례에 접는다
      const out = await app.respond(childTurn, input);
      if (!out.called || sim.lead.openDue() !== "start") return out;
      const opened = await leadCall(childTurn, { kind: "open", open: "start" });
      if (!opened.called)
        return { ...out, ended: opened.ended ?? "입구 start 실패" };
      return {
        ...out,
        final: [out.final, opened.final]
          .filter((l) => l.trim() !== "")
          .join("\n"),
        modelFirstSpoken: [
          out.modelFirstSpoken ?? "",
          opened.modelFirstSpoken ?? "",
        ]
          .filter((l) => l !== "")
          .join("\n"),
        changes: {
          deleted: [...out.changes.deleted, ...opened.changes.deleted],
          added: [...out.changes.added, ...opened.changes.added],
        },
        // 차례당 호출 수 · 시간은 인사 끝 호출만(입구 start 는 entryStart 에 따로 — 검토 rev-x2 M-4)
        entryStart: {
          calls: opened.calls,
          ms: opened.ms,
          firstSent: opened.firstSent ?? null,
          before: out.final,
          said: opened.final,
        },
        ...(opened.lead ? { lead: opened.lead } : {}),
      };
    },
    async more(childTurn) {
      const chosen = sim.chooseMore();
      if (!chosen.ok || chosen.mode !== "claude") return null;
      const out = await leadCall(childTurn, { kind: "open", open: "more" });
      return out.called ? { ...out, afterChoice: true } : null;
    },
    summary() {
      const m = setup.materials;
      return {
        table: leadCandidateTableOf(sim.lead.candidateRows(), {
          unitWords: m.ctx.unitWords,
          lemmaOf: m.lemmaOf,
          homophones: m.homophones,
        }),
      };
    },
  };
}

/** 방식 B: 같은 시스템 · 규격 · 기록 꼴, 행동 지시 줄 없음, 후처리 없음(검사는 기록만). */
function teacherB(setup: Setup, ctx: Ctx, lesson: string): Teacher {
  const m = setup.materials;
  const history: { user: string; assistant: string }[] = [];
  const spoken: string[] = [];
  const childWords: string[] = [];
  let prevContext: TalkLessonContext | null = null;
  let prepWords: string[] = [];
  const sceneWords = talkSceneWordsOf({
    card: m.card,
    unitWords: [...m.ctx.unitWords],
  });
  const contextNow = (): TalkLessonContext => {
    const met = new Set(prepWords);
    for (const text of spoken)
      for (const w of metWordsIn(text, {
        unitWords: m.ctx.unitWords,
        lemmaOf: m.lemmaOf,
      }))
        met.add(w);
    const unknownWords = [...m.ctx.unitWords];
    return {
      unknownWords,
      metUnknownWords: unknownWords.filter((w) => met.has(w)),
      newWords: [...m.newWords],
      friendship: 0,
      missionsDone: [],
    };
  };
  return {
    async open() {
      spoken.push(setup.opening);
      return {
        childTurn: 0,
        called: false,
        modelFirst: null,
        modelFirstSpoken: null,
        directive: null,
        checks: null,
        retry: null,
        changes: { deleted: [], added: [] },
        final: setup.opening,
        branches: ["모델을 부르지 않은 고정 차례"],
        calls: 0,
        ms: 0,
        firstMs: null,
      };
    },
    endedBefore() {
      return null;
    },
    async respond(childTurn, input) {
      const greetingEnd = childTurn === 1;
      const speech =
        input.action === "speak" && input.heard !== null && input.heard !== "";
      const nospeech = input.action === "silent";
      const child = speech ? setup.masker(input.heard ?? "").text : "";
      if (speech) childWords.push(...wordsOf(child));
      const hints = speech
        ? heardHintsOf({
            heard: child,
            answer: null,
            targets: [],
            scene: sceneWords,
            homophones: m.homophones,
            soundAlikes: m.soundAlikes,
            lemmaOf: m.lemmaOf,
          })
        : [];
      const now = contextNow();
      const turn: TalkCallTurn = {
        child,
        input: speech ? "speech" : "dont_know",
        segment: greetingEnd ? "greeting_end" : "talk",
        hintKind: "none",
        hintTier: 0,
        heardHelp: "none",
        reason: speech ? null : nospeech ? "nospeech" : "button",
        kind: "ai",
        aiAsks: !greetingEnd,
        cardLine: null,
        supportStage: 0,
        stuckQuestion: "",
        stuckAnswer: "",
        ifStuck: null,
        chances: {
          carry: { goals: [], words: [] },
          required: [],
          reuse: [],
          introduce: [],
        },
        returnNudge: false,
        allChancesUsed: false,
        followChildTurns: 0,
        ...(hints.length > 0 ? { heardHints: hints } : {}),
        ...(nospeech ? { notHeard: true as const } : {}),
        ...(greetingEnd && setup.nextPart !== undefined
          ? { nextPart: setup.nextPart }
          : {}),
        turnsLeft: 0,
        floor: false,
        closing: false,
        levelTest: false,
        context: talkLessonContextDelta(prevContext, now),
      };
      prevContext = now;
      const full = talkLessonUserMessage(
        turn,
        history.length === 0
          ? { line: setup.openingLine, teacherNameEn: m.teacher.nameEn }
          : undefined,
      );
      const { kept, removed } = splitDirectiveLines(full);
      const user = kept.join("\n");
      const req: Req = {
        ...setup.template,
        body: {
          ...setup.template.body,
          messages: [
            ...history.flatMap((h) => [
              { role: "user", content: h.user },
              { role: "assistant", content: h.assistant },
            ]),
            { role: "user", content: user },
          ],
        },
      };
      const first = await send(ctx, req, { lesson, childTurn, kind: "turn" });
      const raw = parseJson(first.text);
      if (raw === null || typeof raw !== "object")
        throw new CallFailure(
          `${lesson} 아이 차례 ${childTurn}: 응답을 JSON 으로 읽지 못함`,
        );
      const o = raw as Partial<TalkLessonOutput>;
      const modelSpoken = spokenOfLessonOutput(raw) ?? "";
      const appended = greetingEnd ? [setup.firstQuestion] : [];
      const final = [modelSpoken, ...appended]
        .filter((l) => l !== "")
        .join("\n");
      // 기록만 한 검사(A 였다면 걸렸을 것 — 흐름 계획에 기대지 않는 것만): 출력 칸 검사 · 문장 문 · 1~3단계 질문 검사
      const input2: TalkLessonInput = {
        ...m.ctx,
        spec: m.spec,
        teacher: m.teacher,
        card: m.card,
        goalTexts: m.goalTexts,
        carryGoals: [],
        summaries: [],
        history: [...history],
        turn,
        lineRange: {
          allowedWords: m.allowedWords,
          forms: m.forms,
          allowedForms: m.allowedForms,
          childWords: [...childWords],
          reaskWords: [],
        },
        lemmaOf: m.lemmaOf,
        homophones: m.homophones,
      };
      const evaluated = evaluateLessonMessage(
        first.result,
        input2,
        setup.rules,
      );
      let checkHits: number | null = null;
      let gateBlocked: string[] = [];
      let questionCheck: unknown = null;
      if (evaluated.value !== null) {
        checkHits = checkOutputFields(talkLessonCheckFields(evaluated.value), {
          forbidden: m.forbidden,
          sentenceMaxWords: m.ctx.sentenceMaxWords,
        }).size;
        const gate = createToriSentenceGate({
          forbidden: m.forbidden,
          metaPhrases: m.metaPhrases,
          safeLine: safeLineOf(m.card.safeLines, history.length + 1),
          sentenceMaxWords: m.ctx.sentenceMaxWords,
        });
        for (const s of splitSentences(String(o.tori_en ?? ""))) gate.accept(s);
        gateBlocked = gate.blocked().map((b) => JSON.stringify(b));
        const questions = splitSentences(String(o.tori_en ?? "")).filter((s) =>
          isQuestionSentence(s),
        );
        const last = questions.at(-1);
        questionCheck = {
          questions: questions.length,
          ...(last !== undefined
            ? {
                last,
                result: checkLowLevelQuestion(last, {
                  ...lineOptionsOf(setup, childWords),
                  targets: evaluated.value.next_targets,
                }),
              }
            : {}),
        };
      }
      history.push({
        user,
        assistant: talkLessonRewriteOf({
          sentSentences: splitSentences(String(o.tori_en ?? "")),
          sound: {
            ...(typeof o.model_line === "string" && o.model_line.trim() !== ""
              ? { modelLine: o.model_line }
              : {}),
            ...(Array.isArray(o.choices) && o.choices.length === 2
              ? { choices: o.choices }
              : {}),
          },
          appended,
        }),
      });
      spoken.push(final);
      if (greetingEnd) prepWords = [...setup.prepPlan];
      const farewellOnly =
        String(o.tori_en ?? "").trim() === "" &&
        String(o.farewell ?? "").trim() !== "";
      return {
        childTurn,
        called: true,
        modelFirst: raw,
        modelFirstSpoken: modelSpoken,
        directive: removed,
        checks: {
          recordOnly: true,
          verdict: evaluated.verdict,
          outputFieldHits: checkHits,
          sentenceGateBlocked: gateBlocked,
          questionCheck,
          childKind: o.child_kind ?? null,
          stuck: o.stuck ?? null,
          nextMove: o.next_move ?? null,
        },
        retry: null,
        changes: sentenceDiffOf([modelSpoken], final),
        final,
        branches: greetingEnd ? ["고정 문구를 붙임"] : ["그대로 나감"],
        calls: 1,
        ms: first.ms,
        firstMs: first.ms,
        ...(farewellOnly
          ? { ended: "모델이 끝인사만 냄(tori_en 빈 글 · farewell)" }
          : {}),
      };
    },
  };
}

/** 방식 C · C2: 안전 · 단계 정보만(C2 는 목표 세 줄을 더함), say · say_ko 출력, 후처리 없음. */
function teacherC(
  setup: Setup,
  ctx: Ctx,
  lesson: string,
  arm: "C" | "C2",
): Teacher {
  const system = arm === "C" ? setup.cSystem : setup.c2System;
  const { format: _drop, ...outputConfig } = setup.template.body
    .output_config as Record<string, unknown>;
  const base = withFormat(
    { ...setup.template.body, system, output_config: outputConfig },
    COutputSchema,
  );
  const history: { user: string; assistant: string }[] = [];
  const call = async (childTurn: number, user: string): Promise<TeacherOut> => {
    const req: Req = {
      ...setup.template,
      body: {
        ...base,
        messages: [
          ...history.flatMap((h) => [
            { role: "user", content: h.user },
            { role: "assistant", content: h.assistant },
          ]),
          { role: "user", content: user },
        ],
      },
    };
    const first = await send(ctx, req, { lesson, childTurn, kind: "turn" });
    const parsed = COutputSchema.safeParse(parseJson(first.text));
    if (!parsed.success)
      throw new CallFailure(
        `${lesson} 아이 차례 ${childTurn}: say 출력을 읽지 못함`,
      );
    history.push({ user, assistant: first.text });
    const say = parsed.data.say.trim();
    return {
      childTurn,
      called: true,
      modelFirst: parsed.data,
      modelFirstSpoken: say,
      directive: null,
      checks: null,
      retry: null,
      changes: { deleted: [], added: [] },
      final: say,
      branches: ["그대로 나감"],
      calls: 1,
      ms: first.ms,
      firstMs: first.ms,
    };
  };
  return {
    open: () => call(0, C_START_MESSAGE),
    endedBefore: () => null,
    respond: (childTurn, input) =>
      call(
        childTurn,
        cChildMessageOf(
          input.action,
          input.action === "speak" ? setup.masker(input.heard ?? "").text : "",
        ),
      ),
  };
}

/**
 * 방식 P: C 와 같은 길(호출 값 · 기록 꼴 · 아이 입력 줄)에 시제품의 짧은 안내문(P_SYSTEM)과 일곱 칸 출력, 차례마다 아이 입력 줄 뒤에 붙이는
 * 상태 알림(pStatusOf). 아이에게 나가는 말은 say 그대로(후처리 없음). 지난 사용자 메시지는 그때의 상태 알림째 그대로 남는다.
 */
function teacherP(setup: Setup, ctx: Ctx, lesson: string): Teacher {
  const { format: _drop, ...outputConfig } = setup.template.body
    .output_config as Record<string, unknown>;
  const base = withFormat(
    {
      ...setup.template.body,
      system: setup.pSystem,
      output_config: outputConfig,
    },
    POutputSchema,
  );
  const history: { user: string; assistant: string }[] = [];
  const heardBefore: string[] = [];
  let lastModelSentence = "";
  const call = async (
    childTurn: number,
    user: string,
    status: string | null,
  ): Promise<TeacherOut> => {
    const req: Req = {
      ...setup.template,
      body: {
        ...base,
        messages: [
          ...history.flatMap((h) => [
            { role: "user", content: h.user },
            { role: "assistant", content: h.assistant },
          ]),
          { role: "user", content: user },
        ],
      },
    };
    const first = await send(
      ctx,
      req,
      { lesson, childTurn, kind: "turn" },
      "say",
    );
    const parsed = POutputSchema.safeParse(parseJson(first.text));
    if (!parsed.success)
      throw new CallFailure(
        `${lesson} 아이 차례 ${childTurn}: P 출력을 읽지 못함`,
      );
    history.push({ user, assistant: first.text });
    lastModelSentence = parsed.data.model_sentence;
    const say = parsed.data.say.trim();
    return {
      childTurn,
      called: true,
      modelFirst: parsed.data,
      modelFirstSpoken: say,
      directive: null,
      ...(status !== null ? { status } : {}),
      checks: null,
      retry: null,
      changes: { deleted: [], added: [] },
      final: say,
      branches: ["그대로 나감"],
      calls: 1,
      ms: first.ms,
      firstMs: first.ms,
      firstSentence: first.firstSentence,
      // 선생님이 스스로 마무리함(move wrap_up) — 아이 차례 뒤면 수업을 여기서 끝낸다(runLesson)
      ...(childTurn > 0 && parsed.data.move === "wrap_up"
        ? { ended: TEACHER_CLOSING_REASON }
        : {}),
    };
  };
  return {
    open: () => call(0, C_START_MESSAGE, null),
    endedBefore: () => null,
    respond: (childTurn, input) => {
      const heard =
        input.action === "speak" ? setup.masker(input.heard ?? "").text : "";
      const status = pStatusOf({
        childTurn,
        heardBefore: [...heardBefore],
        lastModelSentence,
        action: input.action,
        heard: input.action === "speak" ? heard : null,
        unitWords: P_UNIT_WORDS,
      });
      if (input.action === "speak") heardBefore.push(heard);
      return call(
        childTurn,
        pChildMessageOf(input.action, heard, status),
        status,
      );
    },
  };
}

/**
 * 방식 Q · QP(제안 구조의 시제품, arch-arm-q): 짧은 안내문(qSystemOf) · 네 칸 출력 · 차례마다 아이 입력 줄 하나(상태 알림 · 목표 낱말 · 턴 수
 * 알림 없음). 호출 값은 다른 방식과 같은 틀(회화 턴), 흘려 받아 첫 문장 시각을 잰다. 아이에게 나가는 말은 say 그대로(후처리 없음). 지난 메시지는
 * 고쳐 쓰지 않는다. wrap_up 이 참이면 다음 아이 차례 앞에서 두 단추를 내고(endedBefore), '더 이야기하기'면 Q_MORE_MESSAGE 로 잇는다(more).
 */
function teacherQ(
  setup: Setup,
  ctx: Ctx,
  lesson: string,
  arm: QArm,
  contextIndex: number,
): Teacher {
  const { format: _drop, ...outputConfig } = setup.template.body
    .output_config as Record<string, unknown>;
  // 모델 갈래(R3M · R3O): 안내문 · 메시지는 R3 그대로, 호출의 모델 · 추론 수준(· 끌 수 없는 모델의 생각 단계 · 출력 상한)만 바꾼다
  const over = qCallOverrideOf(arm);
  const base = withFormat(
    {
      ...setup.template.body,
      system: setup.qSystems[arm],
      output_config: over
        ? { ...outputConfig, effort: over.effort }
        : outputConfig,
      ...(over ? { model: over.model } : {}),
      ...(over && over.thinking === "adaptive"
        ? { thinking: { type: "adaptive" } }
        : {}),
      ...(over && over.maxTokens !== null
        ? { max_tokens: over.maxTokens }
        : {}),
    },
    QOutputSchema,
  );
  const history: { user: string; assistant: string }[] = [];
  let wrapPending = false;
  const call = async (childTurn: number, user: string): Promise<TeacherOut> => {
    const req: Req = {
      ...setup.template,
      body: {
        ...base,
        messages: [
          ...history.flatMap((h) => [
            { role: "user", content: h.user },
            { role: "assistant", content: h.assistant },
          ]),
          { role: "user", content: user },
        ],
      },
    };
    const first = await send(
      ctx,
      req,
      { lesson, childTurn, kind: "turn" },
      "say",
    );
    const parsed = QOutputSchema.safeParse(parseJson(first.text));
    if (!parsed.success)
      throw new CallFailure(
        `${lesson} 아이 차례 ${childTurn}: ${arm} 출력을 읽지 못함`,
      );
    history.push({ user, assistant: first.text });
    wrapPending = parsed.data.wrap_up;
    const say = parsed.data.say.trim();
    const f = first.firstSentence;
    return {
      childTurn,
      called: true,
      modelFirst: parsed.data,
      modelFirstSpoken: say,
      directive: null,
      checks: null,
      retry: null,
      changes: { deleted: [], added: [] },
      final: say,
      branches: ["그대로 나감"],
      calls: 1,
      ms: first.ms,
      firstMs: first.ms,
      firstSentence: f,
      // 받아 두는 차례가 없다(후처리 없음) — 첫 문장이 나간 때 = 흘려 읽은 첫 문장 시각(A · P · N 과 같은 뜻)
      firstSent: f
        ? { ms: f.ms, from: f.from, text: f.text, held: null }
        : null,
    };
  };
  return {
    open: () =>
      call(
        0,
        usesLessonFacts(arm)
          ? r2StartMessageOf(r2LessonContextOf(contextIndex))
          : C_START_MESSAGE,
      ),
    endedBefore() {
      if (!wrapPending) return null;
      wrapPending = false;
      return { reason: TEACHER_WRAP_REASON, choice: "wrap_up" };
    },
    respond: (childTurn, input) =>
      call(
        childTurn,
        qChildMessageOf(
          input.action,
          input.action === "speak" ? setup.masker(input.heard ?? "").text : "",
          usesLessonFacts(arm) && input.stt
            ? {
                unsure: input.stt.unsure,
                ...(input.stt.alt
                  ? { alt: setup.masker(input.stt.alt).text }
                  : {}),
              }
            : undefined,
        ),
      ),
    async more(childTurn) {
      const out = await call(childTurn, Q_MORE_MESSAGE);
      return { ...out, afterChoice: true };
    },
  };
}

// ── 방식 CHAT(앱 길의 이야기 방식 — 묶음 T2, spec '회화 대화 구조 R' 설계 13) ─────────────────

/** 수업 시작 시각을 고를 한 주의 첫 때(2026-11-09 월요일 00:00 UTC — 앞뒤 하루를 넉넉히 훑는다). */
const CHAT_WEEK_START_MS = Date.UTC(2026, 10, 9, 0, 0, 0);
const HOUR_MS = 3_600_000;
const CHAT_WEEK_SCAN_HOURS = 8 * 24;

/**
 * 홀로 선 R3 의 수업 시작 맥락(요일 · 때 — 'Friday afternoon')과 같은 때의 시각을 가족 시간대 벽시계로 고른다(앱 chatClockOf 로 확인). 한 주를
 * 한 시간씩 훑어 처음 맞는 시각이고, 다음 한 시간도 같은 때면 그것(경계 바로 위를 피함)이다. 못 찾으면 멈춘다.
 */
export function chatAtOf(
  now: string,
  timeZone: string,
  hours: ChatDayPartHours,
): Date {
  const label = (at: Date) => {
    const c = chatClockOf(at, timeZone, hours);
    return `${c.weekday} ${c.dayPart}`;
  };
  for (let h = 0; h < CHAT_WEEK_SCAN_HOURS; h++) {
    const at = new Date(CHAT_WEEK_START_MS + h * HOUR_MS);
    if (label(at) !== now) continue;
    const next = new Date(at.getTime() + HOUR_MS);
    return label(next) === now ? next : at;
  }
  throw new Error(`수업 시작 맥락을 시각으로 옮기지 못함: ${now}`);
}

/** 미리 보기 다시 돌리기가 기억에 없는 대화 호출 앞에서 멈췄다는 표지(힌트 글을 아이 역에게 보이려고 힌트까지만 부른다). */
class ChatProbeStop extends Error {}

/**
 * 다시 돌리기의 호출 기억(묶음 T2 의 대본 도구 접점): 같은 수업을 처음부터 다시 돌릴 때 앞서 받은 응답을 차례대로 되돌려 주고(요청 본문이
 * 글자까지 같아야 한다 — 다르면 멈춤), 기억에 없는 호출만 real 로 부른다. 미리 보기(probe)는 기억에 없는 대화 호출 앞에서 멈춘다. 대본 도구가
 * 정해진 차례 목록을 받으므로(runChatScenario), 아이 역 AI 가 차례마다 말을 정하는 실험은 차례를 하나씩 늘려 처음부터 다시 돌린다 — 화면 흉내
 * (조용함 타이머 · 힌트 누름 · 설명 · 평가)를 이 도구에 베끼지 않으려는 것이다.
 */
export function createChatCallCache(real: ChatCaller): {
  size(): number;
  callerFor(probe: boolean): ChatCaller;
} {
  const cache: { kind: ChatCallKind; body: string; result: CallResult }[] = [];
  return {
    size: () => cache.length,
    callerFor(probe) {
      let at = 0;
      return async (kind, request) => {
        const i = at;
        at += 1;
        const body = JSON.stringify(request.body);
        const hit = cache[i];
        if (hit !== undefined) {
          if (hit.kind !== kind || hit.body !== body)
            throw new Error(
              `다시 돌린 호출 ${i + 1}(${kind})의 요청이 앞과 다름 — 되돌려 줄 응답이 없다`,
            );
          return hit.result;
        }
        if (probe && kind === "dialog")
          throw new ChatProbeStop("미리 보기: 대화 호출 앞에서 멈춤");
        const result = await real(kind, request);
        cache.push({ kind, body, result });
        return result;
      };
    },
  };
}

/**
 * 이야기 방식 대본을 처음부터 돌린다(대본 도구 runChatScenario 그대로 — 기록 전용 평가 켬, 앱과 같음). 미리 보기가 멈추면 run 은 null 이고 sim 은
 * 멈춘 때의 상태다(그 차례에 받은 힌트가 선생님 행에 저장되어 있다). 대본 도구를 부르는 자리는 이 함수와 chatSimFor 둘뿐이다.
 */
export async function chatReplay(
  makeSim: () => TalkSim,
  steps: readonly ObserveStep[],
  call: ChatCaller,
): Promise<{ sim: TalkSim; run: ChatScenarioRun | null }> {
  const sim = makeSim();
  try {
    return {
      sim,
      run: await runChatScenario(sim, steps, { call, evalOn: true }),
    };
  } catch (error) {
    if (error instanceof ChatProbeStop) return { sim, run: null };
    throw error;
  }
}

/** 미리 보기 대본 차례의 말(대화 호출 앞에서 멈추므로 요청에 실리지 않는다). */
const CHAT_PROBE_SAY = "(probe)";
/** 대본 도구의 호출 갈래 → 기록의 호출 갈래. */
const CHAT_CALL_LOG_KIND: Readonly<Record<ChatCallKind, CallLog["kind"]>> = {
  dialog: "turn",
  hint: "hint",
  explain: "explain",
  eval: "eval",
};

/** 이야기 방식 수업 하나를 돌리는 동안의 상태(실패해도 그때까지의 기록을 남기려고 밖에 둔다). */
type ChatProgress = {
  steps: ObserveStep[];
  /** 대본 차례마다 아이 차례 번호(고르기 차례는 null). */
  stepTurn: (number | null)[];
  children: ChildTurnLog[];
  choices: WrapChoice[];
  sim: TalkSim | null;
  run: ChatScenarioRun | null;
  ended: string | null;
  childTurns: number;
  /** 호출 기록(CallLog)에 적을 아이 차례 번호 — 그 차례의 힌트 미리 보기 · 대화 호출 앞에서 지금 차례로 옮긴다(fix 1 m-3). */
  callTurn: number;
  /** 아이가 '그만하기'를 골라 정리 토막에 닿았다(정리의 되짚을 말을 세는 수업 — fix 1 m-4). */
  reachedWrap: boolean;
  prepWords: string[];
  overrides: Record<string, unknown>;
  start: R2LessonContext;
};

export type RunLessonOptions = {
  /** 긴 대본 한 벌(CHAT 만 — 마무리마다 '더 이야기하기', 힌트 누름 없음). */
  variant?: "long";
  /** 이 수업만 덮는 대화 안전 상한(talk.safety_max_turns — 긴 대본이 안전 상한 사실 줄 차례에 닿게). */
  safetyMax?: number;
  /** 실행 전체의 호출 수 상한. */
  budget?: CallBudget;
};

/**
 * 대본 도구 접점: 이야기 방식 메모리 세션 하나(그 수업의 이름 · 수업 시작 시각 · 만남 수). '더 이야기하기' 입구는 대본 도구가 고른 뒤에만 연다
 * (talk-observe openDue — T2 가 찾은 결함을 T1 이 고침. 그래서 이 묶음의 비켜 가기를 지웠다, fix 1 m-8).
 */
function chatSimFor(
  setup: Setup,
  values: Record<string, unknown>,
  lesson: string,
  start?: { at: Date; met: number },
): TalkSim {
  return createTalkSim(setup.materials, values, setup.config.book, {
    rotationKey: lesson,
    ...(start === undefined ? {} : { chatAt: start.at, chatMet: start.met }),
  });
}

/** 미리 보기 sim 의 마지막 선생님 행 힌트(첫 단 글) — 아이 역에게 보일 글. 받지 못했으면 ok false. */
function chatHintShownOf(sim: TalkSim): ChatHintShown {
  const ask = sim.chat.hintAsk("hint", 0);
  if (ask.kind !== "stored") return { ok: false };
  const reply = chatHintReplyOf({
    record: ask.record,
    tier: 0,
    retriesUsed: 0,
    retryMax: sim.chat.settings.hintRetryMax,
    aiResting: false,
  });
  return reply.ok ? { ok: true, text: reply.text } : { ok: false };
}

/** 대본 차례 기록에서 마지막 끝 줄 신호(선생님 행이 있는 차례). */
function lastSignalOf(run: ChatScenarioRun): ChatTeacherLog["signal"] {
  for (let i = run.turns.length - 1; i >= 0; i--) {
    const rec = run.turns[i]?.record;
    if (rec && rec.teacher !== null) return rec.signal;
  }
  return null;
}

/**
 * 방식 CHAT 수업 하나(spec 설계 13 '시나리오 여덟'): 아이 역 AI 가 차례마다 말을 정하고, 앱 행동을 넣어 대본 차례를 하나씩 늘리며 처음부터 다시
 * 돌린다(chatReplay — 앞 응답은 기억에서). 앱 행동: 말없음은 누르지 않음(조용함 입구 — 가짜 시계) · 눌렀으나 들리지 않음을 번갈아, 힌트 누름(SC ·
 * SD2 셋째 차례마다 첫 단 — 미리 보기로 힌트를 받아 아이 역이 그 글을 본 뒤 말을 정함), 모름 단추, 마무리 단추(SE 첫 마무리 · 긴 대본 마무리마다
 * '더 이야기하기', 그 밖은 아이 역이 고름), 잡음(지난 일정)과 인식기 알림(지난 일정을 낮은 확신 정도 · 다른 후보로). 수업 시작 맥락은 같은 수업의
 * R3 와 같다(요일 · 때 · 만남 수).
 */
async function chatLessonRun(
  setup: Setup,
  ctx: Ctx,
  lesson: string,
  child: ChildKey,
  seed: number,
  turns: number,
  opts: { long: boolean; safetyMax: number | null },
  p: ChatProgress,
): Promise<void> {
  const values: Record<string, unknown> = {
    ...setup.values,
    [TALK_LEAD_MODE_KEY]: "chat",
    ...p.overrides,
  };
  const probe = chatSimFor(setup, values, lesson);
  if (!probe.chat.on)
    throw new Error(
      `${lesson}: 이야기 방식 세션이 아니다(1~3단계 · 선생님 이야기 방식 칸 확인)`,
    );
  const settings = probe.chat.settings;
  if (!(CHAT_LOW_CONFIDENCE < settings.unsureConfidence))
    throw new Error(
      `${lesson}: 실험의 낮은 확신 정도(${CHAT_LOW_CONFIDENCE})가 문턱 talk.chat_unsure_confidence(${settings.unsureConfidence}) 아래가 아니다`,
    );
  p.prepWords = probe.chat.prepOpens ? [...setup.prepPlan] : [];
  const start = {
    at: chatAtOf(
      p.start.now,
      String(values["app.timezone"]),
      settings.dayPartHours,
    ),
    met: p.start.met,
  };
  const makeSim = () => chatSimFor(setup, values, lesson, start);
  const cache = createChatCallCache(
    async (kind, request) =>
      (
        await send(
          ctx,
          {
            body: request.body,
            betas: request.betas,
            timeoutMs: request.timeoutMs,
          },
          { lesson, childTurn: p.callTurn, kind: CHAT_CALL_LOG_KIND[kind] },
          kind === "dialog" ? "say" : undefined,
        )
      ).result,
  );
  const childCall = childRole(setup, ctx, lesson, child);
  const replay = async (): Promise<ChatScenarioRun> => {
    const r = await chatReplay(makeSim, p.steps, cache.callerFor(false));
    if (r.run === null) throw new Error(`${lesson}: 다시 돌리기가 멈춤`);
    p.sim = r.sim;
    p.run = r.run;
    return r.run;
  };
  let run = await replay();
  let consumed = 0;
  let pending: ChatHeardSegment[] = [];
  const takeHeard = () => {
    for (const t of run.turns.slice(consumed)) {
      if (t.entry === "wait") {
        pending.push({ kind: "teacher", text: "" });
        continue;
      }
      if (t.record === null) continue;
      if (t.entry === "back" && p.prepWords.length > 0)
        pending.push({ kind: "prep", words: p.prepWords });
      pending.push({ kind: "teacher", text: t.record.heard });
    }
    consumed = run.turns.length;
  };
  const noiseOn = childHasNoise(child);
  // 말없음 덩이(fix 1 I-1): 앞 아이 차례가 힌트 없는 말없음이면 같은 덩이의 갈래를 잇고, 아니면 새 덩이를 연다
  let silentBlocks = 0;
  let blockInput: ChatChildLog["input"] | null = null;
  let injected = 0;
  let forced = 0;
  for (let t = 1; t <= turns; t++) {
    if (run.stopped !== null) {
      p.ended = `아이 차례 ${t} 앞: ${run.stopped}`;
      return;
    }
    let stop = (p.sim as TalkSim).stopBefore();
    while (stop !== null && stop.choice !== null) {
      takeHeard();
      const kind: WrapChoice["kind"] =
        stop.choice === "closing" ? "closing" : "wrap_up";
      const line =
        [...pending]
          .reverse()
          .find(
            (s): s is Extract<ChatHeardSegment, { kind: "teacher" }> =>
              s.kind === "teacher",
          )?.text ?? "";
      const forcedPick = chatForcedPickOf({
        child,
        long: opts.long,
        forcedBefore: forced,
      });
      let picked: WrapPick;
      let says = "";
      let why: string;
      if (forcedPick !== null) {
        forced += 1;
        picked = forcedPick;
        why = `앱 행동: 시나리오가 정한 단추(${opts.long ? "긴 대본 — 마무리 차례마다" : "SE — 첫 마무리 단추"} '더 이야기하기')`;
        pending.push({ kind: "picked", pick: picked });
      } else {
        const message = chatChildMessageOf(pending, null);
        const out = await childCall.chooseWith(
          t,
          wrapChoiceMessageOf(message.replace(/^Teacher: /, "")),
        );
        picked = out.wrap_choice;
        says = out.says.trim();
        why = out.why;
        pending = [];
      }
      const choice: WrapChoice = {
        childTurn: t,
        kind,
        line,
        picked,
        says,
        why,
        continued: false,
      };
      p.choices.push(choice);
      p.steps.push({ choose: picked });
      p.stepTurn.push(null);
      p.callTurn = t;
      run = await replay();
      if (picked === "stop") {
        p.reachedWrap = true;
        p.ended = `아이 차례 ${t} 앞: ${kind === "wrap_up" ? TEACHER_WRAP_REASON : stop.reason}`;
        return;
      }
      choice.continued = run.turns
        .slice(consumed)
        .some((x) => x.entry === "more" && x.record !== null);
      if (!choice.continued) {
        p.ended = `아이 차례 ${t} 앞: ${stop.reason} — '더 이야기하기'를 잇지 못함`;
        return;
      }
      stop = (p.sim as TalkSim).stopBefore();
    }
    if (stop !== null) {
      p.ended = `아이 차례 ${t} 앞: ${stop.reason}`;
      return;
    }
    takeHeard();
    const signal = lastSignalOf(run);
    let hint: ChatHintShown | null = null;
    let hintTier = 0;
    p.callTurn = t;
    if (!opts.long && chatHintTurnOf(child, t) && signal?.hint === true) {
      hintTier = 1;
      const peek = await chatReplay(
        makeSim,
        [...p.steps, { say: CHAT_PROBE_SAY, hintTier }],
        cache.callerFor(true),
      );
      hint = chatHintShownOf(peek.sim);
    }
    const heardTeacher = pending
      .flatMap((s) => (s.kind === "teacher" ? [heardByChild(s.text)] : []))
      .join("\n");
    const { out } = await childCall.ask(t, chatChildMessageOf(pending, hint));
    pending = [];
    const says = out.says.trim();
    const action: ChildAction =
      out.action === "speak" && says === "" ? "silent" : out.action;
    let heard: string | null = null;
    let noise: NoiseResult | null = null;
    let stt: SttNote | null = null;
    const noiseTurn = noiseOn && isNoiseTurn(seed, t);
    let step: ObserveStep;
    let input: ChatChildLog["input"];
    let recognizer: ChatChildLog["recognizer"] = null;
    const tier = hintTier > 0 ? { hintTier } : {};
    if (action === "speak") {
      if (noiseTurn) {
        noise = noiseOf(says, injected);
        stt = sttNoteOf({
          noise,
          injectedBefore: injected,
          says,
          noiseOn,
          childTurn: t,
        });
        injected += 1;
        heard = noise.heard;
      } else {
        heard = says;
        stt = sttNoteOf({
          noise: null,
          injectedBefore: injected,
          says,
          noiseOn,
          childTurn: t,
        });
      }
      recognizer =
        chatRecognizerOf(stt, {
          lowConfidence: CHAT_LOW_CONFIDENCE,
          alternatives: signal?.alternatives ?? 0,
        }) ?? null;
      input = "say";
      step = {
        say: heard,
        ...tier,
        ...(recognizer === null ? {} : { chat: { recognizer } }),
      };
    } else if (action === "dont_know") {
      input = "dont_know";
      step = { input: "dont_know", ...tier };
    } else {
      // 힌트를 누른 차례는 입력이 있었으므로 조용함이 아니라 '눌렀으나 들리지 않음'이다(spec 설계 6 타이머의 범위) — 덩이를 끊고 덩이 셈에 넣지 않는다
      if (hintTier > 0) input = "nospeech";
      else {
        if (blockInput === null) {
          blockInput = chatSilentInputOf(silentBlocks);
          silentBlocks += 1;
        }
        input = blockInput;
      }
      step = { input, ...tier };
    }
    if (!(action === "silent" && hintTier === 0)) blockInput = null;
    p.children.push({
      type: "child_turn",
      lesson,
      childTurn: t,
      heardTeacher: heardTeacher === "" ? heardByChild("") : heardTeacher,
      action,
      says,
      kind: out.kind,
      why: out.why,
      heard,
      noise,
      noiseSkipped: noiseTurn && action !== "speak",
      ...(stt ? { stt } : {}),
      chat: { input, hintTier, hint, recognizer, waited: false },
    });
    p.childTurns = t;
    p.steps.push(step);
    p.stepTurn.push(t);
    run = await replay();
  }
  if (run.stopped !== null) {
    p.ended = `아이 차례 ${p.childTurns}: ${run.stopped}`;
    return;
  }
  const after = (p.sim as TalkSim).stopBefore();
  if (after !== null && after.choice === null)
    p.ended = `아이 차례 ${p.childTurns}: ${after.reason}`;
}

/** 대본 도구 차례 기록 하나 → CHAT 선생님 차례 기록. */
function chatTeacherLogOf(t: ChatScenarioTurn): ChatTeacherLog {
  const rec = t.record;
  const chat = rec?.teacher?.move.chat;
  const usage = t.usage;
  return {
    entry: t.entry as ChatTeacherLog["entry"],
    turnEnd: rec?.turnEnd ?? null,
    facts: [...(rec?.facts ?? [])],
    signal: rec?.signal ? { ...rec.signal } : null,
    wrapUp: rec?.value?.wrap_up === true,
    wrapUpHeld: chat?.wrapUpHeld ?? null,
    listen: chat?.listen ? { ...chat.listen } : null,
    removed: [...(chat?.removed ?? [])],
    firstMoved: false,
    madeUp: [...(chat?.madeUp ?? [])],
    closed: rec?.close != null,
    failure: rec?.failure ?? null,
    diverged: rec?.diverged === true,
    usage: usage
      ? {
          firstSentenceMs: usage.firstSentenceMs,
          inputTokens: usage.inputTokens,
          cacheReadTokens: usage.cacheReadTokens,
          cacheWriteTokens: usage.cacheWriteTokens,
          outputTokens: usage.outputTokens,
          costUsd: usage.costUsd,
          latencyMs: usage.latencyMs,
        }
      : null,
    calls: { ...t.calls },
    costUsd: t.costUsd,
    waitedMs: t.waitedMs,
    hints: t.hints.map((h) => ({
      tier: h.tier,
      retry: h.retry,
      called: h.called,
      ok: h.reply.ok,
    })),
    explain: t.explain
      ? { called: t.explain.called, ok: t.explain.reply.ok }
      : null,
    evals: t.evals.map((e) => ({ status: e.status, called: e.called })),
  };
}

/** 방식 CHAT 수업 하나의 기록 줄(선생님 차례 · 아이 차례)을 마지막으로 다시 돌린 차례 기록에서 만든다. */
function chatLinesOf(
  setup: Setup,
  lesson: string,
  p: ChatProgress,
): { teachers: TeacherTurnLog[]; children: ChildTurnLog[] } {
  const children = p.children.map((c) => ({
    ...c,
    ...(c.chat ? { chat: { ...c.chat } } : {}),
  }));
  const teachers: TeacherTurnLog[] = [];
  const run = p.run;
  if (run === null) return { teachers, children };
  let lastChild = 0;
  for (const t of run.turns) {
    if (t.entry === "choose") continue;
    if (t.entry === "wait") {
      const turn = p.stepTurn[t.no - 1];
      const c = children.find((x) => x.childTurn === turn);
      if (c?.chat) c.chat.waited = true;
      continue;
    }
    const rec = t.record;
    if (rec === null) continue;
    let childTurn = lastChild;
    let afterChoice = false;
    if (t.no > 0) {
      childTurn = p.stepTurn[t.no - 1] ?? lastChild;
      lastChild = childTurn;
    } else if (t.entry === "more") {
      childTurn = lastChild + 1;
      afterChoice = true;
    }
    const raw = rec.raw as { say?: unknown } | null;
    const rawSay = typeof raw?.say === "string" ? raw.say.trim() : null;
    const final = rec.heard;
    const changes = sentenceDiffOf([rawSay ?? ""], final);
    const branches: Branch[] = [];
    if (rec.failure !== null) branches.push("고정 문구를 붙임");
    else {
      if (changes.added.length > 0) branches.push("고정 문구를 붙임");
      if (changes.deleted.length > 0) branches.push("모델의 문장을 지움");
    }
    if (branches.length === 0) branches.push("그대로 나감");
    const latency = t.usage?.latencyMs ?? 0;
    const firstText =
      splitSentences((rawSay ?? final).replaceAll("\n", " "))[0] ?? null;
    // 첫 문장 시간의 글은 응답 say 의 첫 문장이다(소리 줄로 빠진 차례도 — 표지 firstMoved)
    const firstMs = t.usage?.firstSentenceMs ?? null;
    const firstSentence: FirstSentence | null =
      t.usage === null
        ? null
        : {
            ms: firstMs ?? latency,
            from: firstMs === null ? "end" : "stream",
            text: firstText,
            question: firstText !== null && isQuestionSentence(firstText),
          };
    const childWords = children
      .filter((c) => c.childTurn <= childTurn && c.heard !== null)
      .flatMap((c) => wordsOf(c.heard ?? ""));
    teachers.push({
      type: "teacher_turn",
      lesson,
      arm: CHAT_ARM,
      childTurn,
      called: t.calls.dialog > 0,
      modelFirst: rec.raw,
      modelFirstSpoken: rawSay,
      directive: null,
      status: rec.userMessage,
      checks: null,
      retry: null,
      changes,
      final,
      branches,
      levelFit: levelFitFor(setup, final.replaceAll("{NAME}", ""), childWords),
      calls: t.calls.dialog,
      ms: latency,
      firstMs: t.usage === null ? null : latency,
      firstSentence,
      // 아이에게 첫 문장이 나간 때는 아이 차례 뒤(말 · 조용함)만 — 입구(수업 첫 말 · 돌아옴 · 더 이야기하기)는 N 과 같이 뺀다
      firstSent:
        firstSentence !== null && (t.entry === "child" || t.entry === "quiet")
          ? {
              ms: firstSentence.ms,
              from: firstSentence.from,
              text: firstSentence.text,
              held: null,
            }
          : null,
      ...(afterChoice ? { afterChoice: true as const } : {}),
      chat: {
        ...chatTeacherLogOf(t),
        firstMoved:
          rawSay !== null &&
          firstText !== null &&
          (rec.teacher?.move.chat?.removed ?? []).some(
            (r) => normalizeSpoken(r) === normalizeSpoken(firstText),
          ),
      },
    });
  }
  return { teachers, children };
}

/** 방식 CHAT 수업 하나를 돌려 기록 줄을 낸다(runLesson 의 CHAT 갈래). */
async function runChatLesson(
  setup: Setup,
  ctx: Ctx,
  lesson: string,
  child: ChildKey,
  seed: number,
  turns: number,
  attempt: number,
  opts: RunLessonOptions,
  lines: LogLine[],
): Promise<LessonRun> {
  const startedAt = new Date().toISOString();
  const failures: string[] = [];
  const p: ChatProgress = {
    steps: [],
    stepTurn: [],
    children: [],
    choices: [],
    sim: null,
    run: null,
    ended: null,
    childTurns: 0,
    callTurn: 0,
    reachedWrap: false,
    prepWords: [],
    overrides:
      opts.safetyMax === undefined
        ? {}
        : { "talk.safety_max_turns": opts.safetyMax },
    start: r2LessonContextOf(ALL_CHILDREN.indexOf(child) + seed),
  };
  try {
    await chatLessonRun(
      setup,
      ctx,
      lesson,
      child,
      seed,
      turns,
      { long: opts.variant === "long", safetyMax: opts.safetyMax ?? null },
      p,
    );
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }
  const { teachers, children } = chatLinesOf(setup, lesson, p);
  lines.push(...teachers, ...children);
  const closing = new Set(setup.materials.card.closingLines.map((l) => l.en));
  const lastFinal = teachers.at(-1)?.final ?? null;
  lines.push({
    type: "lesson",
    lesson,
    arm: CHAT_ARM,
    child,
    seed,
    turnsAsked: turns,
    childTurns: p.childTurns,
    ended: p.ended,
    attempt,
    failures,
    startedAt,
    finishedAt: new Date().toISOString(),
    ending: lessonEndingOf({
      ended: p.ended,
      failures,
      childTurns: p.childTurns,
      lastLine: lastFinal,
      choices: p.choices,
    }),
    noise: childHasNoise(child),
    materials: { functionWords: setup.materials.functionWords.size },
    ...(opts.variant === "long" ? { variant: "long" as const } : {}),
    chat: {
      calls: p.run ? { ...p.run.calls } : noChatCalls(),
      costUsd: p.run?.costUsd ?? 0,
      wrap: (p.sim?.chat.wrapLines() ?? []).map((l) => ({
        en: l.en,
        card: closing.has(l.en),
      })),
      prepWords: [...p.prepWords],
      overrides: { ...p.overrides },
      start: { ...p.start },
      reachedWrap: p.reachedWrap,
    },
  });
  return {
    lesson,
    ok: failures.length === 0,
    error: failures[0] ?? null,
    lines,
  };
}

function noChatCalls(): ChatCallCounts {
  return Object.fromEntries(
    CHAT_CALL_KINDS.map((k) => [k, 0]),
  ) as ChatCallCounts;
}

// ── 아이 역 ─────────────────────────────────────────────────────

function childRole(setup: Setup, ctx: Ctx, lesson: string, child: ChildKey) {
  const system = childSystemOf(child);
  const { format: _drop, ...outputConfig } = setup.template.body
    .output_config as Record<string, unknown>;
  const base = withFormat(
    { ...setup.template.body, system, output_config: outputConfig },
    ChildOutputSchema,
  );
  // 마무리 차례에서만 고른 단추 칸(wrap_choice)을 더한 출력 규격으로 부른다(보통 차례의 요청은 지난 실험 그대로)
  const wrapBase = withFormat(
    { ...setup.template.body, system, output_config: outputConfig },
    WrapChildOutputSchema,
  );
  const history: { user: string; assistant: string }[] = [];
  const ask = async <T extends z.ZodType>(
    childTurn: number,
    body: Record<string, unknown>,
    user: string,
    schema: T,
  ): Promise<z.infer<T>> => {
    const req: Req = {
      ...setup.template,
      body: {
        ...body,
        messages: [
          ...history.flatMap((h) => [
            { role: "user", content: h.user },
            { role: "assistant", content: h.assistant },
          ]),
          { role: "user", content: user },
        ],
      },
    };
    const res = await send(ctx, req, { lesson, childTurn, kind: "child" });
    const parsed = schema.safeParse(parseJson(res.text));
    if (!parsed.success)
      throw new CallFailure(
        `${lesson} 아이 차례 ${childTurn}: 아이 역 출력을 읽지 못함`,
      );
    history.push({ user, assistant: res.text });
    return parsed.data;
  };
  return {
    turn: async (childTurn: number, teacherFinal: string) => {
      const heard = heardByChild(teacherFinal);
      const out = await ask(
        childTurn,
        base,
        `Teacher: ${heard}`,
        ChildOutputSchema,
      );
      return { out, heardTeacher: heard };
    },
    /** CHAT: 앱 행동을 담은 말(chatChildMessageOf)을 그대로 보낸다(보통 차례 출력 규격). */
    ask: async (childTurn: number, user: string) => ({
      out: await ask(childTurn, base, user, ChildOutputSchema),
    }),
    /** CHAT: 마무리 차례의 두 단추 안내를 붙인 말(wrapChoiceMessageOf 꼴)을 그대로 보낸다. */
    chooseWith: (childTurn: number, user: string) =>
      ask(childTurn, wrapBase, user, WrapChildOutputSchema),
    /** 앱의 마무리 차례: 선생님 말 뒤 두 단추 가운데 하나를 고르게 한다. */
    choose: (childTurn: number, teacherFinal: string) =>
      ask(
        childTurn,
        wrapBase,
        wrapChoiceMessageOf(heardByChild(teacherFinal)),
        WrapChildOutputSchema,
      ),
  };
}

// ── 수업 하나 ────────────────────────────────────────────────────

export type LessonRun = {
  lesson: string;
  ok: boolean;
  error: string | null;
  lines: LogLine[];
};

export async function runLesson(
  setup: Setup,
  client: Anthropic,
  arm: Arm,
  child: ChildKey,
  seed: number,
  turns: number,
  attempt: number,
  opts: RunLessonOptions = {},
): Promise<LessonRun> {
  const lesson = lessonName(arm, child, seed, opts.variant);
  const lines: LogLine[] = [];
  const ctx: Ctx = {
    client,
    book: setup.config.book,
    log: (l) => lines.push(l),
    ...(opts.budget === undefined ? {} : { budget: opts.budget }),
  };
  if (arm === CHAT_ARM)
    return runChatLesson(
      setup,
      ctx,
      lesson,
      child,
      seed,
      turns,
      attempt,
      opts,
      lines,
    );
  const startedAt = new Date().toISOString();
  const teacher =
    arm === "A"
      ? teacherA(setup, ctx, lesson)
      : arm === "B"
        ? teacherB(setup, ctx, lesson)
        : arm === "P"
          ? teacherP(setup, ctx, lesson)
          : arm === "N"
            ? teacherN(setup, ctx, lesson)
            : isQArm(arm)
              ? teacherQ(
                  setup,
                  ctx,
                  lesson,
                  arm,
                  ALL_CHILDREN.indexOf(child) + seed,
                )
              : teacherC(setup, ctx, lesson, arm);
  const childCall = childRole(setup, ctx, lesson, child);
  const choices: WrapChoice[] = [];
  const childWords: string[] = [];
  // 잡음은 아이 역으로 정한다(K1~K3 · SC · SD 만 — 같은 아이 · 씨앗이면 방식마다 같은 차례)
  const noiseOn = childHasNoise(child);
  const pushTeacher = (out: TeacherOut) =>
    lines.push({
      type: "teacher_turn",
      lesson,
      arm,
      ...out,
      levelFit: levelFitFor(setup, out.final.replaceAll("{NAME}", ""), [
        ...childWords,
      ]),
    });
  let ended: string | null = null;
  let childTurns = 0;
  let lastFinal: string | null = null;
  // N 의 인사 끝 차례 뒤 짧은 준비가 열리면(실제 카드 첫 수업) 아이 역에게 쪽지 줄을 넣는다
  const prepWords = setup.nextPart === "prep" ? [...setup.prepPlan] : [];
  let prepSplit: ChatHeardSegment[] | null = null;
  const failures: string[] = [];
  try {
    const opened = await teacher.open();
    pushTeacher(opened);
    lastFinal = opened.final;
    let last = opened.final;
    let injected = 0;
    for (let t = 1; t <= turns; t++) {
      const before = teacher.endedBefore(t);
      if (before) {
        let continued = false;
        if (before.choice) {
          // 앱의 마무리 차례: 아이 역이 두 단추 가운데 하나를 고른다. '더 이야기하기'면 앱처럼 잇는다(A: 카드 자리 한 줄, N: 입구 more —
          // 두 방식이 같은 길이로 견줘지게, 묶음 X2). 이을 길이 없는 방식 · 이을 거리가 없으면 그 자리에서 끝난다(continued false)
          const pick = await childCall.choose(t, last);
          const next =
            pick.wrap_choice === "more" && teacher.more
              ? await teacher.more(t)
              : null;
          choices.push({
            childTurn: t,
            kind: before.choice,
            line: last,
            picked: pick.wrap_choice,
            says: pick.says.trim(),
            why: pick.why,
            continued: next !== null,
          });
          if (next !== null) {
            pushTeacher(next);
            last = next.final;
            lastFinal = next.final;
            continued = true;
          }
        }
        if (!continued) {
          ended = `아이 차례 ${t} 앞: ${before.reason}`;
          break;
        }
      }
      // N 이 짧은 준비 길을 지난 차례(인사 끝 → 쪽지 → 입구 start)는 CHAT 과 같은 꼴로 쪽지 줄을 넣는다(T2 fix 1 m-2)
      const { out, heardTeacher } =
        prepSplit === null
          ? await childCall.turn(t, last)
          : {
              out: (await childCall.ask(t, chatChildMessageOf(prepSplit, null)))
                .out,
              heardTeacher: heardByChild(last),
            };
      prepSplit = null;
      const says = out.says.trim();
      const action: ChildAction =
        out.action === "speak" && says === "" ? "silent" : out.action;
      let heard: string | null = null;
      let noise: NoiseResult | null = null;
      let stt: SttNote | null = null;
      const noiseTurn = noiseOn && isNoiseTurn(seed, t);
      if (action === "speak") {
        if (noiseTurn) {
          noise = noiseOf(says, injected);
          stt = sttNoteOf({
            noise,
            injectedBefore: injected,
            says,
            noiseOn,
            childTurn: t,
          });
          injected++;
          heard = noise.heard;
        } else {
          heard = says;
          stt = sttNoteOf({
            noise: null,
            injectedBefore: injected,
            says,
            noiseOn,
            childTurn: t,
          });
        }
        childWords.push(...wordsOf(heard));
      }
      lines.push({
        type: "child_turn",
        lesson,
        childTurn: t,
        heardTeacher,
        action,
        says,
        kind: out.kind,
        why: out.why,
        heard,
        noise,
        noiseSkipped: noiseTurn && action !== "speak",
        ...(usesLessonFacts(arm) && stt ? { stt } : {}),
      });
      childTurns = t;
      const res = await teacher.respond(t, { action, heard, stt });
      if (!res.called && res.ended) {
        ended = `아이 차례 ${t}: ${res.ended}`;
        break;
      }
      pushTeacher(res);
      last = res.final;
      lastFinal = res.final;
      prepSplit =
        arm === "N" &&
        prepWords.length > 0 &&
        res.entryStart?.before !== undefined &&
        res.entryStart.said !== undefined
          ? [
              { kind: "teacher", text: res.entryStart.before },
              { kind: "prep", words: prepWords },
              { kind: "teacher", text: res.entryStart.said },
            ]
          : null;
      if (res.ended) {
        ended = `아이 차례 ${t}: ${res.ended}`;
        break;
      }
    }
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }
  lines.push({
    type: "lesson",
    lesson,
    arm,
    child,
    seed,
    turnsAsked: turns,
    childTurns,
    ended,
    attempt,
    failures,
    startedAt,
    finishedAt: new Date().toISOString(),
    ending: lessonEndingOf({
      ended,
      failures,
      childTurns,
      lastLine: lastFinal,
      choices,
    }),
    ...(teacher.summary ? { lead: teacher.summary() } : {}),
    noise: noiseOn,
    materials: { functionWords: setup.materials.functionWords.size },
  });
  return {
    lesson,
    ok: failures.length === 0,
    error: failures[0] ?? null,
    lines,
  };
}

// ── 사람이 읽는 대화 기록 ─────────────────────────────────────────

/** 마무리 단추가 나온 차례의 갈래 이름(대화 기록 · 시나리오 글). */
export const WRAP_KIND_LABEL: Readonly<Record<WrapChoice["kind"], string>> = {
  closing: "마무리 물음",
  suggestion: "마무리 제안",
  wrap_up: "선생님의 마무리(wrap_up)",
};

export function transcriptOf(lines: readonly LogLine[]): string {
  const lessonLine = lines.find((l): l is LessonLog => l.type === "lesson");
  const out: string[] = [
    `# ${lessonLine?.lesson ?? "-"}`,
    "",
    `- 방식 ${lessonLine?.arm} · 아이 ${lessonLine?.child} · 씨앗 ${lessonLine?.seed} · 아이 차례 ${lessonLine?.childTurns}/${lessonLine?.turnsAsked} · 시도 ${lessonLine?.attempt}`,
    `- 끝: ${lessonLine?.ended ?? "아이 차례 상한"}${lessonLine && lessonLine.failures.length > 0 ? ` · 실패: ${lessonLine.failures.join(" / ")}` : ""}`,
    ...(lessonLine?.noise === undefined
      ? []
      : [`- 잡음: ${lessonLine.noise ? "넣음(지금 일정)" : "넣지 않음"}`]),
    ...(lessonLine?.ending?.choices ?? []).map(
      (c) =>
        `- 마무리 단추(아이 차례 ${c.childTurn} 앞 · ${WRAP_KIND_LABEL[c.kind]}): ${c.picked === "more" ? "더 이야기하기" : "그만하기"}${c.picked === "more" ? (c.continued ? (c.kind === "wrap_up" ? " · '더 이야기하기' 메시지로 이음" : " · 앱처럼 이음") : " · 이을 길이 없어 여기서 끝남") : ""} · ${c.why}`,
    ),
    "",
  ];
  const teacherLines = lines.filter(
    (l): l is TeacherTurnLog => l.type === "teacher_turn",
  );
  const childLines = lines.filter(
    (l): l is ChildTurnLog => l.type === "child_turn",
  );
  // CHAT 은 한 아이 차례 뒤에 선생님 차례가 여럿일 수 있다(인사 끝 차례 → 짧은 준비 → 돌아옴). 다른 방식은 하나라 지난 글과 같다
  const teachersAt = (n: number) =>
    teacherLines.filter((t) => t.childTurn === n && t.afterChoice !== true);
  const continuedAt = (n: number) =>
    teacherLines.find((t) => t.childTurn === n && t.afterChoice === true);
  const block = (t: TeacherTurnLog | undefined) => {
    if (!t) return [];
    const rows = [
      `**선생님**(${[...(t.chat ? [`입구 ${t.chat.entry}`] : []), ...t.branches].join(" · ")}):`,
      "",
      ...t.final.split("\n").map((l) => `> ${l}`),
      "",
    ];
    // CHAT: 사실 줄 · 따라 할 문장 대조 · 지어낸 경험 꼴 · 힌트 · 설명 · 호출(갈래별) · 안전 상한
    if (t.chat) {
      const c = t.chat;
      const notes = [
        ...(c.facts.length > 0 ? [`사실 줄: ${c.facts.join(" · ")}`] : []),
        ...(c.listen
          ? [
              `따라 할 문장 "${c.listen.sentence}"(${c.listen.inSay ? (c.listen.partial ? "문장 일부로만 듦" : "말에 듦") : "어긋남"})`,
            ]
          : []),
        ...(c.madeUp.length > 0
          ? [`지어낸 경험 꼴: ${c.madeUp.join(" · ")}`]
          : []),
        ...(c.wrapUp
          ? [
              `wrap_up 참${c.wrapUpHeld ? `(거짓으로 다룸 — ${c.wrapUpHeld})` : ""}`,
            ]
          : []),
        ...(c.hints.length > 0
          ? [
              `힌트 누름 ${c.hints.map((h) => `${h.tier + 1}단${h.retry > 0 ? ` 다시 받기 ${h.retry}` : ""} ${h.ok ? "받음" : "실패"}`).join(" · ")}`,
            ]
          : []),
        ...(c.explain
          ? [`막힌 뒤 설명 ${c.explain.ok ? "보임" : "실패"}`]
          : []),
        ...(c.closed ? ["안전 상한 — 수업 닫음"] : []),
        `호출 ${CHAT_CALL_KINDS.filter((k) => c.calls[k] > 0)
          .map((k) => `${k} ${c.calls[k]}`)
          .join(
            " · ",
          )} · ${c.costUsd}달러${c.usage?.firstSentenceMs != null ? ` · 첫 문장 ${c.usage.firstSentenceMs}ms` : ""}`,
      ];
      rows.push(...notes.map((x) => `- ${x}`), "");
    }
    if (
      t.called &&
      t.modelFirstSpoken !== null &&
      flat(t.modelFirstSpoken) !== flat(t.final)
    )
      rows.push(
        "모델의 처음 말:",
        "",
        ...t.modelFirstSpoken.split("\n").map((l) => `> ${l}`),
        "",
      );
    if (t.retry)
      rows.push(`다시 쓰기(${t.retry.kind}): ${t.retry.outcome ?? "-"}`, "");
    // 방식 Q · QP: 따라 할 문장을 낸 차례 · 마무리를 꺼낸 차례
    if (isQArm(t.arm)) {
      const q = t.modelFirst as {
        listen_sentence?: unknown;
        wrap_up?: unknown;
      } | null;
      const listen =
        typeof q?.listen_sentence === "string" ? q.listen_sentence.trim() : "";
      if (listen !== "")
        rows.push(`- 따라 할 문장(listen_sentence): "${listen}"`);
      if (q?.wrap_up === true)
        rows.push("- wrap_up: 참(선생님이 마무리를 꺼냄)");
      if (listen !== "" || q?.wrap_up === true) rows.push("");
    }
    return rows;
  };
  out.push("## 처음", "", ...teachersAt(0).flatMap(block));
  for (const c of childLines) {
    out.push(`## 아이 차례 ${c.childTurn}`, "");
    const cont = continuedAt(c.childTurn);
    if (cont)
      out.push(
        "- (마무리 단추에서 '더 이야기하기'를 고름)",
        "",
        ...block(cont).map((l) =>
          l.startsWith("**선생님**")
            ? l.replace("**선생님**", "**선생님(단추 뒤)**")
            : l,
        ),
      );
    out.push(
      `- 아이: ${c.action === "speak" ? `"${c.says}"` : c.action === "dont_know" ? "('잘 모르겠어요' 단추)" : c.chat?.input === "quiet" ? "(말 없음 — 누르지 않음(조용함))" : c.chat?.input === "nospeech" ? "(말 없음 — 눌렀으나 들리지 않음)" : "(말 없음)"} · ${c.kind} · ${c.why}`,
    );
    if (c.chat && c.chat.hintTier > 0)
      out.push(
        `- 힌트 ${c.chat.hintTier}단을 누름${c.chat.hint?.ok ? `(아이 역이 본 글 "${c.chat.hint.text}")` : "(받지 못함)"}`,
      );
    if (c.chat?.waited)
      out.push("- 선생님이 더 말하지 않고 기다림(잇달아 말한 수 상한)");
    if (c.action === "speak")
      out.push(
        `- 들린 글: "${c.heard ?? ""}"${c.noise ? ` (잡음 ${c.noise.how === "swap" ? `${c.noise.from}→${c.noise.to}` : "말 전체 바꿈"})` : ""}`,
      );
    if (c.noiseSkipped) out.push("- 잡음 차례였으나 말하지 않아 건너뜀");
    if (c.stt)
      out.push(
        c.chat
          ? `- 인식기 정보(턴 요청에 실음): ${c.chat.recognizer ? `확신 정도 ${c.chat.recognizer.confidence}${c.chat.recognizer.alternative ? ` · 다른 후보 "${c.chat.recognizer.alternative}"` : ""}` : "없음"}`
          : `- 인식기 알림(선생님에게 전함): 확신 없음${c.stt.alt ? ` · 다른 후보 "${c.stt.alt}"` : ""}`,
      );
    out.push("");
    out.push(...teachersAt(c.childTurn).flatMap(block));
  }
  return `${out.join("\n")}\n`;
}

// ── 실행 ────────────────────────────────────────────────────────

export type RunArgs = {
  out: string;
  pilot: boolean;
  turns: number;
  children: ChildKey[];
  seeds: number[];
  arms: Arm[];
  /** 실험 재료의 카드(--card replay | lesson1, 기본 replay — 지난 실험). */
  card: SetupCard;
  /** 실제 AI 호출을 한다(--call). 없으면 계획만 찍고 끝낸다. */
  call: boolean;
  /** 실행 전체의 실제 호출 수 상한(--max-calls — --call 이면 꼭 둔다). */
  maxCalls: number | null;
  /** 긴 대본 한 벌(--long — CHAT · SE · 씨앗 1)을 더한다. */
  long: boolean;
  /** 긴 대본의 아이 차례(--long-turns, 기본 40). */
  longTurns: number;
  /** 긴 대본의 대화 안전 상한(--long-safety-max, 기본 긴 대본의 아이 차례 — 그 차례에 안전 상한 사실 줄이 붙는다). */
  longSafetyMax: number;
};

export function parseRunArgs(argv: readonly string[]): RunArgs {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const out = get("--out");
  if (!out) throw new Error("--out <폴더> 가 필요하다");
  const pilot = argv.includes("--pilot");
  const list = <T extends string>(v: string | undefined, all: readonly T[]) =>
    v === undefined
      ? [...all]
      : v.split(",").map((x) => {
          if (!all.includes(x as T)) throw new Error(`모르는 값: ${x}`);
          return x as T;
        });
  const positive = (flag: string): number | null => {
    const v = get(flag);
    if (v === undefined) return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n <= 0)
      throw new Error(`${flag} 는 1 이상 정수다: ${v}`);
    return n;
  };
  const call = argv.includes("--call");
  const maxCalls = positive("--max-calls");
  if (call && maxCalls === null)
    throw new Error(
      "--call 에는 --max-calls <수> 가 필요하다(호출 수 상한 — 13절 C243 보완 5 (6))",
    );
  const card = get("--card") ?? "replay";
  if (!(SETUP_CARDS as readonly string[]).includes(card))
    throw new Error(`모르는 카드: ${card}(replay · lesson1)`);
  const longTurns = positive("--long-turns") ?? CHAT_LONG_TURNS;
  return {
    out,
    pilot,
    turns: Number(get("--turns") ?? (pilot ? PILOT_TURNS : FULL_TURNS)),
    children:
      pilot && !get("--children")
        ? ["K2"]
        : get("--children") === undefined
          ? [...CHILDREN]
          : list(get("--children"), ALL_CHILDREN),
    seeds:
      pilot && !get("--seeds")
        ? [1]
        : (get("--seeds") ?? SEEDS.join(",")).split(",").map(Number),
    arms: list(get("--arms"), ARMS),
    card: card as SetupCard,
    call,
    maxCalls,
    long: argv.includes("--long"),
    longTurns,
    longSafetyMax: positive("--long-safety-max") ?? longTurns,
  };
}

// ── 계획(부르기 전 — 수업 · 방식 · 호출 갈래별 위쪽 어림 수와 어림 비용) ─────────────────

/** 실행할 수업 하나(시나리오 수업 · 긴 대본). */
export type PlannedLesson = {
  lesson: string;
  arm: Arm;
  child: ChildKey;
  seed: number;
  turns: number;
  variant?: "long";
};

/** costUsd 는 위쪽 어림(캐시 할인 없음 · 출력 600), cachedCostUsd 는 캐시를 받는 어림(앞 기록은 캐시 읽기 · 출력 200) — 둘 다 추측. */
export type LessonPlan = PlannedLesson & {
  calls: PlanCalls;
  costUsd: number;
  cachedCostUsd: number;
};

export type RunPlan = {
  lessons: LessonPlan[];
  total: {
    calls: PlanCalls;
    all: number;
    costUsd: number;
    cachedCostUsd: number;
  };
};

const PLAN_KIND_LABEL: Readonly<Record<keyof PlanCalls, string>> = {
  dialog: "대화",
  rewrite: "다시 쓰기",
  child: "아이 역",
  hint: "힌트",
  explain: "설명",
  eval: "평가",
};

/** 이 실행이 돌 수업(방식 × 아이 × 씨앗, --long 이면 긴 대본 한 벌을 끝에). */
export function plannedLessonsOf(args: RunArgs): PlannedLesson[] {
  const out: PlannedLesson[] = [];
  for (const child of args.children)
    for (const seed of args.seeds)
      for (const arm of args.arms)
        out.push({
          lesson: lessonName(arm, child, seed),
          arm,
          child,
          seed,
          turns: args.turns,
        });
  // 긴 대본은 CHAT 을 돌릴 때만(fix 1 m-7)
  if (args.long && args.arms.includes(CHAT_ARM))
    out.push({
      lesson: lessonName(CHAT_ARM, CHAT_LONG_CHILD, CHAT_LONG_SEED, "long"),
      arm: CHAT_ARM,
      child: CHAT_LONG_CHILD,
      seed: CHAT_LONG_SEED,
      turns: args.longTurns,
      variant: "long",
    });
  return out;
}

const noPlanCalls = (): PlanCalls => ({
  dialog: 0,
  rewrite: 0,
  child: 0,
  hint: 0,
  explain: 0,
  eval: 0,
});

/**
 * 수업 하나의 위쪽 어림 호출 수(재지 않은 값 — 상한을 정하는 근거): 마무리 단추는 '더 이야기하기' 한 바퀴(talk.more_talk_round_turns)마다 한 번 +
 * 하나까지. 아이 역은 아이 차례 + 단추. 선생님 쪽: R · Q 갈래는 수업 첫 말 + 아이 차례 + 이음, N 은 + 입구 start · 좁은 정의 다시 말하기(차례마다),
 * A 는 + 다시 쓰기(차례마다), B · C · C2 · P 는 첫 말 + 아이 차례. CHAT 은 대화(수업 첫 말 + 돌아옴 + 아이 차례 + 이음) · 힌트(누르는 차례 ×
 * (첫 누름 + 다시 받기 상한)) · 설명(아이 차례마다 — 모두 막힘일 때) · 평가(아이 차례마다 — 모두 말일 때).
 */
function lessonCallsOf(
  l: PlannedLesson,
  k: {
    roundTurns: number;
    prepOpens: boolean;
    hintRetryMax: number;
  },
): PlanCalls {
  const c = noPlanCalls();
  const wraps = Math.floor(l.turns / k.roundTurns) + 1;
  c.child = l.turns + wraps;
  if (l.arm === CHAT_ARM) {
    c.dialog = 1 + (k.prepOpens ? 1 : 0) + l.turns + wraps;
    const hintTurns =
      l.variant === "long"
        ? 0
        : Array.from({ length: l.turns }, (_, i) => i + 1).filter((t) =>
            chatHintTurnOf(l.child, t),
          ).length;
    c.hint = hintTurns * (1 + k.hintRetryMax);
    c.explain = l.turns;
    c.eval = l.turns;
  } else if (l.arm === "N") {
    c.dialog = 1 + l.turns + 1 + wraps;
    c.rewrite = l.turns;
  } else if (l.arm === "A") {
    c.dialog = 1 + l.turns + wraps;
    c.rewrite = l.turns;
  } else if (isQArm(l.arm)) c.dialog = 1 + l.turns + wraps;
  else c.dialog = 1 + l.turns;
  return c;
}

/** 방식마다 선생님 대화 호출의 안내문(어림 입력 토큰의 바탕). */
function dialogSystemOf(setup: Setup, arm: Arm): string {
  if (arm === CHAT_ARM) return setup.chatSystem ?? "";
  if (arm === "N") return setup.nSystem ?? "";
  if (arm === "A" || arm === "B") return setup.appSystem;
  if (arm === "C") return setup.cSystem;
  if (arm === "C2") return setup.c2System;
  if (arm === "P") return setup.pSystem;
  return isQArm(arm) ? setup.qSystems[arm] : "";
}

/**
 * 실행 계획(부르기 전): 수업마다 호출 갈래별 위쪽 어림 수와 어림 비용(planCallsCostUsdOf — 캐시 할인 없음). 단가는 그 호출의 모델(대화 · 아이 역은
 * 회화 턴 모델, 모델 갈래 R3M · R3O 는 그 모델, 힌트 · 설명 · 평가는 그 목적의 모델)이다. AI 를 부르지 않는다.
 */
export function runPlanOf(setup: Setup, args: RunArgs): RunPlan {
  const values = { ...setup.values, [TALK_LEAD_MODE_KEY]: "chat" };
  const probe = chatSimFor(setup, values, "plan");
  const chat = probe.chat.settings;
  const roundTurns = Number(setup.values["talk.more_talk_round_turns"]);
  if (!Number.isInteger(roundTurns) || roundTurns <= 0)
    throw new Error("talk.more_talk_round_turns 를 읽지 못함");
  const book = setup.config.book;
  const level = setup.materials.level;
  const modelOf = (
    purpose: "talk_turn" | "talk_chat_hint" | "talk_chat_eval",
  ) => requestConfigOf({ purpose, level, values, book }).model;
  const priceOf = (model: string) => book.get(model) ?? null;
  const hintChars = (() => {
    try {
      const dummy: TalkChatHintInput = {
        level,
        sentenceMaxWords: setup.materials.ctx.sentenceMaxWords,
        hintTiers: [...setup.materials.spec.hintTiers],
        teacherNameEn: setup.materials.teacher.nameEn,
        say: "",
        context: [],
      };
      return talkChatHintSystem(dummy, talkChatHintSpec.rulesOf(values, dummy))
        .length;
    } catch {
      return 0;
    }
  })();
  const lessons = plannedLessonsOf(args).map((l): LessonPlan => {
    const calls = lessonCallsOf(l, {
      roundTurns,
      prepOpens: probe.chat.prepOpens,
      hintRetryMax: chat.hintRetryMax,
    });
    const over = isQArm(l.arm) ? qCallOverrideOf(l.arm) : null;
    const dialogPrice = priceOf(over?.model ?? modelOf(PURPOSE));
    const systemChars = dialogSystemOf(setup, l.arm).length;
    const costOf = (mode: "upper" | "cached") =>
      planCallsCostUsdOf({
        n: calls.dialog,
        systemChars,
        growing: true,
        price: dialogPrice,
        mode,
      }) +
      planCallsCostUsdOf({
        n: calls.rewrite,
        systemChars,
        growing: true,
        price: dialogPrice,
        mode,
      }) +
      planCallsCostUsdOf({
        n: calls.child,
        systemChars: childSystemOf(l.child).length,
        growing: true,
        price: priceOf(modelOf(PURPOSE)),
        mode,
      }) +
      planCallsCostUsdOf({
        n: calls.hint + calls.explain,
        systemChars: hintChars,
        growing: false,
        contextTurns: chat.hintContextTurns,
        price: priceOf(modelOf("talk_chat_hint")),
        mode,
      }) +
      planCallsCostUsdOf({
        n: calls.eval,
        systemChars: TALK_CHAT_EVAL_SYSTEM.length,
        growing: false,
        contextTurns: chat.evalContextTurns,
        price: priceOf(modelOf("talk_chat_eval")),
        mode,
      });
    const round6 = (x: number) => Math.round(x * 1e6) / 1e6;
    return {
      ...l,
      calls,
      costUsd: round6(costOf("upper")),
      cachedCostUsd: round6(costOf("cached")),
    };
  });
  const calls = noPlanCalls();
  for (const l of lessons)
    for (const k of Object.keys(calls) as (keyof PlanCalls)[])
      calls[k] += l.calls[k];
  return {
    lessons,
    total: {
      calls,
      all: Object.values(calls).reduce((a, b) => a + b, 0),
      costUsd:
        Math.round(lessons.reduce((a, l) => a + l.costUsd, 0) * 1e6) / 1e6,
      cachedCostUsd:
        Math.round(lessons.reduce((a, l) => a + l.cachedCostUsd, 0) * 1e6) /
        1e6,
    },
  };
}

/** 계획 줄: 방식마다(긴 대본은 따로) 수업 수 · 호출 갈래별 어림 수 · 어림 비용, 끝에 합계. */
export function planLinesOf(plan: RunPlan): string[] {
  const groups = new Map<string, LessonPlan[]>();
  for (const l of plan.lessons) {
    const key = l.variant === "long" ? `${l.arm} 긴 대본` : l.arm;
    groups.set(key, [...(groups.get(key) ?? []), l]);
  }
  const kinds = Object.keys(PLAN_KIND_LABEL) as (keyof PlanCalls)[];
  const callsText = (c: PlanCalls) =>
    kinds
      .filter((k) => c[k] > 0)
      .map((k) => `${PLAN_KIND_LABEL[k]} ${c[k]}`)
      .join(" · ");
  const lines = [...groups.entries()].map(([key, ls]) => {
    const c = noPlanCalls();
    for (const l of ls) for (const k of kinds) c[k] += l.calls[k];
    const cost = ls.reduce((a, l) => a + l.costUsd, 0);
    const cached = ls.reduce((a, l) => a + l.cachedCostUsd, 0);
    return `${key} · 수업 ${ls.length} · 호출 어림(위쪽) ${callsText(c)} · 위쪽 약 ${cost.toFixed(4)}달러 · 캐시 어림 약 ${cached.toFixed(4)}달러`;
  });
  lines.push(
    `합계: 수업 ${plan.lessons.length} · 호출 어림(위쪽) ${plan.total.all}(${callsText(plan.total.calls)}) · 위쪽 약 ${plan.total.costUsd.toFixed(4)}달러(캐시 할인 없음 · 출력 600 토큰) · 캐시 어림 약 ${plan.total.cachedCostUsd.toFixed(4)}달러(앞 기록 캐시 읽기 · 출력 200 토큰) — 둘 다 재지 않은 추측. 이 호출은 앱의 호출 기록 · 하루 알림에 들지 않는다(쓴 비용은 장부에)`,
  );
  return lines;
}

/** 어림 호출 수가 상한을 넘는가(넘으면 부르지 않고 끝낸다). */
export function planOverCap(plan: RunPlan, maxCalls: number): boolean {
  return plan.total.all > maxCalls;
}

function writeLesson(dir: string, run: LessonRun): void {
  const runs = join(dir, "runs");
  mkdirSync(runs, { recursive: true });
  writeFileSync(
    join(runs, `${run.lesson}.jsonl`),
    `${run.lines.map((l) => JSON.stringify(l)).join("\n")}\n`,
  );
  writeFileSync(
    join(runs, `${run.lesson}.transcript.md`),
    transcriptOf(run.lines),
  );
}

type RunSummaryRow = {
  lesson: string;
  attempts: number;
  ok: boolean;
  errors: string[];
};

/** 앞 실행과 같아야 하는 공통 재료(이 값이 다르면 앞 수업과 견줄 수 없다). */
const SETUP_SAME_KEYS = [
  "script",
  "card",
  "level",
  "unit",
  "lesson",
  "teacher",
  "settingsSource",
  "pricesSource",
  "talkValues",
  "template",
  "opening",
  "openingLine",
  "firstQuestion",
  "nextPart",
  "prepPlan",
  "appSystemSha",
  "cSystem",
  "c2System",
] as const;

/**
 * 결과 폴더에 앞 실행의 setup.json 이 있으면 공통 재료가 같은지 보고(다르면 멈춤) 앞 값을 남긴 채 P 값과 이번 실행 인자를 더한다.
 * 앞 실행의 인자는 argsHistory 첫 칸에 남는다.
 */
export function mergeSetup(
  path: string,
  next: Record<string, unknown>,
): Record<string, unknown> {
  if (!existsSync(path)) return next;
  const prev = JSON.parse(readFileSync(path, "utf8")) as Record<
    string,
    unknown
  >;
  const differ = SETUP_SAME_KEYS.filter(
    (k) => JSON.stringify(prev[k]) !== JSON.stringify(next[k]),
  );
  if (differ.length > 0)
    throw new Error(
      `앞 실행과 공통 재료가 다름(${differ.join(", ")}) — 같은 폴더에 합치지 않는다`,
    );
  const history = Array.isArray(prev.argsHistory)
    ? prev.argsHistory
    : [prev.args];
  return {
    ...prev,
    pSystem: next.pSystem,
    pSystemSha: next.pSystemSha,
    ...(next.nSystem === undefined
      ? {}
      : { nSystem: next.nSystem, nSystemSha: next.nSystemSha }),
    ...(next.qSystems === undefined
      ? {}
      : { qSystems: next.qSystems, qSystemsSha: next.qSystemsSha }),
    ...(next.chatSystem === undefined
      ? {}
      : { chatSystem: next.chatSystem, chatSystemSha: next.chatSystemSha }),
    pWordsSameAsUnit: next.pWordsSameAsUnit,
    // 계획은 이번 실행의 값이고, 앞 계획은 기록으로 남긴다(fix 1 m-7)
    ...(next.plan === undefined
      ? {}
      : {
          plan: next.plan,
          planHistory: [
            ...(Array.isArray(prev.planHistory)
              ? prev.planHistory
              : prev.plan === undefined
                ? []
                : [prev.plan]),
            next.plan,
          ],
        }),
    args: next.args,
    argsHistory: [...history, next.args],
  };
}

async function main(): Promise<number> {
  const args = parseRunArgs(process.argv.slice(2));
  const root = process.cwd();
  const setup = setupOf(root, { card: args.card });
  // 부르기 전: 수업 · 방식 · 호출 갈래별 어림 수와 어림 비용(늘 찍는다)
  const plan = runPlanOf(setup, args);
  for (const line of planLinesOf(plan)) console.log(line);
  if (!args.call) {
    console.log(
      "arch-compare: 계획만 — 부르지 않았다(실제 호출은 --call --max-calls <수>, 컨트롤러가 비용을 확인한 뒤)",
    );
    return 0;
  }
  const maxCalls = args.maxCalls as number;
  if (planOverCap(plan, maxCalls)) {
    console.error(
      `arch-compare: 어림 호출 수 ${plan.total.all} 가 상한 ${maxCalls} 를 넘어 부르지 않는다(--max-calls 를 올리거나 수업을 줄인다)`,
    );
    return 3;
  }
  const key = readApiKey();
  if (key === null) {
    console.error("arch-compare: ANTHROPIC_API_KEY 가 없습니다(.env.local)");
    return 2;
  }
  const client = createScriptClient(key) as unknown as Anthropic;
  const budget: CallBudget = { left: maxCalls };
  mkdirSync(args.out, { recursive: true });
  const progress = join(args.out, "progress.log");
  const say = (line: string) => {
    console.log(line);
    appendFileSync(progress, `${new Date().toISOString()} ${line}\n`);
  };
  const setupJson = {
    script: setup.script.name,
    ...(setup.card === "replay" ? {} : { card: setup.card }),
    level: setup.materials.level,
    unit: setup.materials.unit,
    lesson: setup.materials.lessonNo,
    teacher: setup.materials.teacher.nameEn,
    settingsSource: setup.config.settingsSource,
    pricesSource: setup.config.pricesSource,
    talkValues: Object.fromEntries(
      Object.entries(setup.values).filter(
        ([k]) => k.startsWith("talk.") || k.includes("talk_turn"),
      ),
    ),
    template: {
      ...requestLogOf(setup.template),
      system: `(A 시스템 ${setup.appSystem.length}자 · sha ${sha(setup.appSystem)})`,
      messages: "(턴마다)",
    },
    opening: setup.opening,
    openingLine: setup.openingLine,
    firstQuestion: setup.firstQuestion,
    nextPart: setup.nextPart,
    prepPlan: setup.prepPlan,
    appSystemSha: sha(setup.appSystem),
    cSystem: setup.cSystem,
    c2System: setup.c2System,
    pSystem: setup.pSystem,
    pSystemSha: sha(setup.pSystem),
    nSystem: setup.nSystem,
    nSystemSha: setup.nSystem === null ? null : sha(setup.nSystem),
    pWordsSameAsUnit: setup.pWordsSameAsUnit,
    qSystems: setup.qSystems,
    qSystemsSha: Object.fromEntries(
      Q_ARMS.map((arm) => [arm, sha(setup.qSystems[arm])]),
    ),
    chatSystem: setup.chatSystem,
    chatSystemSha: setup.chatSystem === null ? null : sha(setup.chatSystem),
    plan: { total: plan.total, maxCalls },
    args,
  };
  writeFileSync(
    join(args.out, "setup.json"),
    `${JSON.stringify(mergeSetup(join(args.out, "setup.json"), setupJson), null, 2)}\n`,
  );
  const summaryPath = join(args.out, "run-summary.json");
  const earlier: RunSummaryRow[] = existsSync(summaryPath)
    ? (JSON.parse(readFileSync(summaryPath, "utf8")) as RunSummaryRow[])
    : [];
  const summary: RunSummaryRow[] = [];
  let capped = false;
  // 쓴 비용의 누계(호출 기록의 costUsd 합 — 수업 줄마다 progress.log 에 적는다, fix 1 m-7)
  let spentUsd = 0;
  const spentOf = (r: LessonRun) =>
    r.lines.reduce(
      (a, l) => a + (l.type === "call" ? (l.response.costUsd ?? 0) : 0),
      0,
    );
  /** 수업 하나를 돌리고(실패하면 그 수업만 두 번까지 다시 — 상한 오류는 다시 돌리지 않음) 기록을 쓴다. */
  const settle = async (
    first: LessonRun,
    again: (attempt: number) => Promise<LessonRun>,
  ) => {
    let run = first;
    spentUsd += spentOf(first);
    const errors: string[] = [];
    let attempts = 1;
    while (
      !run.ok &&
      attempts <= RERUN_MAX &&
      !isCapError(run.error ?? "") &&
      !capped
    ) {
      errors.push(run.error ?? "-");
      say(
        `  ${run.lesson} 실패(${run.error}) → 그 수업만 다시(시도 ${attempts + 1})`,
      );
      attempts++;
      run = await again(attempts);
      spentUsd += spentOf(run);
    }
    if (!run.ok) errors.push(run.error ?? "-");
    if (isCapError(run.error ?? "")) capped = true;
    writeLesson(args.out, run);
    summary.push({ lesson: run.lesson, attempts, ok: run.ok, errors });
    const lessonLine = run.lines.find(
      (l): l is LessonLog => l.type === "lesson",
    );
    say(
      `  ${run.lesson}: ${run.ok ? "끝" : "실패"} · 아이 차례 ${lessonLine?.childTurns ?? 0} · ${lessonLine?.ended ?? "상한"} · 남은 호출 ${budget.left} · 쓴 비용 누계 ${spentUsd.toFixed(4)}달러`,
    );
  };
  for (const child of args.children) {
    if (capped) break;
    for (const seed of args.seeds) {
      if (capped) break;
      say(`조합 ${child} · 씨앗 ${seed}: ${args.arms.join(" · ")} 동시 시작`);
      const runs = await Promise.all(
        args.arms.map((arm) =>
          runLesson(setup, client, arm, child, seed, args.turns, 1, {
            budget,
          }),
        ),
      );
      for (const [i, first] of runs.entries()) {
        const arm = args.arms[i] as Arm;
        await settle(first, (attempt) =>
          runLesson(setup, client, arm, child, seed, args.turns, attempt, {
            budget,
          }),
        );
      }
    }
  }
  if (args.long && args.arms.includes(CHAT_ARM) && !capped) {
    const opts: RunLessonOptions = {
      variant: "long",
      safetyMax: args.longSafetyMax,
      budget,
    };
    say(
      `긴 대본: ${CHAT_ARM} · ${CHAT_LONG_CHILD} · 씨앗 ${CHAT_LONG_SEED} · 아이 차례 ${args.longTurns} · 안전 상한 ${args.longSafetyMax}`,
    );
    const first = await runLesson(
      setup,
      client,
      CHAT_ARM,
      CHAT_LONG_CHILD,
      CHAT_LONG_SEED,
      args.longTurns,
      1,
      opts,
    );
    await settle(first, (attempt) =>
      runLesson(
        setup,
        client,
        CHAT_ARM,
        CHAT_LONG_CHILD,
        CHAT_LONG_SEED,
        args.longTurns,
        attempt,
        opts,
      ),
    );
  }
  if (capped)
    say(`호출 수 상한 ${maxCalls} 에 닿아 멈췄다 — 남은 수업은 돌리지 않았다`);
  const now = new Set(summary.map((r) => r.lesson));
  writeFileSync(
    summaryPath,
    `${JSON.stringify(
      [...earlier.filter((r) => !now.has(r.lesson)), ...summary],
      null,
      2,
    )}\n`,
  );
  say(
    `쓴 호출 ${maxCalls - budget.left} / 상한 ${maxCalls} · 쓴 비용 누계 ${spentUsd.toFixed(4)}달러(실패해 다시 돌린 시도의 호출 포함)`,
  );
  return summary.every((s) => s.ok) ? 0 : 1;
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  void main().then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 2;
    },
  );
}

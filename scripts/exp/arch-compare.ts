// 회화 구조 비교 실험(13절 C234 · task-exp-harness · task-exp-arm-p): 선생님 쪽 다섯 방식(A · B · C · C2 · P)과 아이 역(K1 · K2 · K3)이 번갈아 말하는 연속 수업.
// 사용: node --env-file-if-exists=.env.local --import tsx scripts/exp/arch-compare.ts --out <폴더> [--pilot] [--turns 16]
//        [--children K1,K2,K3 | SA,SB,SC,SD,SE,SF] [--seeds 1,2] [--arms A,B,C,C2,P,N,Q,QP]
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
  qChildMessageOf,
  qSystemOf,
} from "./arch-arm-q";
import {
  C_START_MESSAGE,
  type ChildAction,
  type ChildKey,
  type ChildOutput,
  ChildOutputSchema,
  COutputSchema,
  c2SystemOf,
  cChildMessageOf,
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
  type SpeechField,
  sentenceDiffOf,
  TEACHER_CLOSING_REASON,
  TEACHER_WRAP_REASON,
} from "./arch-metrics";
import { isNoiseTurn, type NoiseResult, noiseOf } from "./arch-noise";

export const ARMS = ["A", "B", "C", "C2", "P", "N", "Q", "QP", "R"] as const;
export type Arm = (typeof ARMS)[number];
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

export function lessonName(arm: Arm, child: ChildKey, seed: number): string {
  return `${arm}-${child}-s${seed}`;
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
  /** turn: 선생님 턴 · rewrite: 앱의 다시 쓰기(N 은 좁은 정의 다시 말하기) · child: 아이 역(그 밖). */
  kind: "turn" | "rewrite" | "child";
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
  entryStart?: { calls: number; ms: number; firstSent: FirstSent | null };
  ended?: string;
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

export type Setup = {
  root: string;
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

export function setupOf(root: string): Setup {
  const config = loadScriptConfig({ root });
  const scriptFile = readScriptFiles(root).find(
    (f) => f.file === `${SOURCE_SCRIPT}.json`,
  );
  if (!scriptFile) throw new Error(`대본 없음: ${SOURCE_SCRIPT}`);
  const parsed = parseObserveScript(scriptFile.raw, scriptFile.file);
  if (!parsed.ok) throw new Error(parsed.error);
  const script = parsed.script;
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

export type ChildInput = { action: ChildAction; heard: string | null };

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
function teacherQ(setup: Setup, ctx: Ctx, lesson: string, arm: QArm): Teacher {
  const { format: _drop, ...outputConfig } = setup.template.body
    .output_config as Record<string, unknown>;
  const base = withFormat(
    {
      ...setup.template.body,
      system: setup.qSystems[arm],
      output_config: outputConfig,
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
    open: () => call(0, C_START_MESSAGE),
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
        ),
      ),
    async more(childTurn) {
      const out = await call(childTurn, Q_MORE_MESSAGE);
      return { ...out, afterChoice: true };
    },
  };
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
): Promise<LessonRun> {
  const lesson = lessonName(arm, child, seed);
  const lines: LogLine[] = [];
  const ctx: Ctx = {
    client,
    book: setup.config.book,
    log: (l) => lines.push(l),
  };
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
              ? teacherQ(setup, ctx, lesson, arm)
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
      const { out, heardTeacher } = await childCall.turn(t, last);
      const says = out.says.trim();
      const action: ChildAction =
        out.action === "speak" && says === "" ? "silent" : out.action;
      let heard: string | null = null;
      let noise: NoiseResult | null = null;
      const noiseTurn = noiseOn && isNoiseTurn(seed, t);
      if (action === "speak") {
        if (noiseTurn) {
          noise = noiseOf(says, injected);
          injected++;
          heard = noise.heard;
        } else heard = says;
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
      });
      childTurns = t;
      const res = await teacher.respond(t, { action, heard });
      if (!res.called && res.ended) {
        ended = `아이 차례 ${t}: ${res.ended}`;
        break;
      }
      pushTeacher(res);
      last = res.final;
      lastFinal = res.final;
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
  const teacherAt = (n: number) =>
    teacherLines.find((t) => t.childTurn === n && t.afterChoice !== true);
  const continuedAt = (n: number) =>
    teacherLines.find((t) => t.childTurn === n && t.afterChoice === true);
  const block = (t: TeacherTurnLog | undefined) => {
    if (!t) return [];
    const rows = [
      `**선생님**(${t.branches.join(" · ")}):`,
      "",
      ...t.final.split("\n").map((l) => `> ${l}`),
      "",
    ];
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
  out.push("## 처음", "", ...block(teacherAt(0)));
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
      `- 아이: ${c.action === "speak" ? `"${c.says}"` : c.action === "dont_know" ? "('잘 모르겠어요' 단추)" : "(말 없음)"} · ${c.kind} · ${c.why}`,
    );
    if (c.action === "speak")
      out.push(
        `- 들린 글: "${c.heard ?? ""}"${c.noise ? ` (잡음 ${c.noise.how === "swap" ? `${c.noise.from}→${c.noise.to}` : "말 전체 바꿈"})` : ""}`,
      );
    if (c.noiseSkipped) out.push("- 잡음 차례였으나 말하지 않아 건너뜀");
    out.push("");
    out.push(...block(teacherAt(c.childTurn)));
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
  };
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
    pWordsSameAsUnit: next.pWordsSameAsUnit,
    args: next.args,
    argsHistory: [...history, next.args],
  };
}

async function main(): Promise<number> {
  const args = parseRunArgs(process.argv.slice(2));
  const root = process.cwd();
  const setup = setupOf(root);
  const key = readApiKey();
  if (key === null) {
    console.error("arch-compare: ANTHROPIC_API_KEY 가 없습니다(.env.local)");
    return 2;
  }
  const client = createScriptClient(key) as unknown as Anthropic;
  mkdirSync(args.out, { recursive: true });
  const progress = join(args.out, "progress.log");
  const say = (line: string) => {
    console.log(line);
    appendFileSync(progress, `${new Date().toISOString()} ${line}\n`);
  };
  const setupJson = {
    script: SOURCE_SCRIPT,
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
  for (const child of args.children)
    for (const seed of args.seeds) {
      say(`조합 ${child} · 씨앗 ${seed}: ${args.arms.join(" · ")} 동시 시작`);
      const runs = await Promise.all(
        args.arms.map((arm) =>
          runLesson(setup, client, arm, child, seed, args.turns, 1),
        ),
      );
      for (const [i, first] of runs.entries()) {
        const arm = args.arms[i] as Arm;
        let run = first;
        const errors: string[] = [];
        let attempts = 1;
        while (!run.ok && attempts <= RERUN_MAX) {
          errors.push(run.error ?? "-");
          say(
            `  ${run.lesson} 실패(${run.error}) → 그 수업만 다시(시도 ${attempts + 1})`,
          );
          attempts++;
          run = await runLesson(
            setup,
            client,
            arm,
            child,
            seed,
            args.turns,
            attempts,
          );
        }
        if (!run.ok) errors.push(run.error ?? "-");
        writeLesson(args.out, run);
        summary.push({ lesson: run.lesson, attempts, ok: run.ok, errors });
        const lessonLine = run.lines.find(
          (l): l is LessonLog => l.type === "lesson",
        );
        say(
          `  ${run.lesson}: ${run.ok ? "끝" : "실패"} · 아이 차례 ${lessonLine?.childTurns ?? 0} · ${lessonLine?.ended ?? "상한"}`,
        );
      }
    }
  const now = new Set(summary.map((r) => r.lesson));
  writeFileSync(
    summaryPath,
    `${JSON.stringify(
      [...earlier.filter((r) => !now.has(r.lesson)), ...summary],
      null,
      2,
    )}\n`,
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

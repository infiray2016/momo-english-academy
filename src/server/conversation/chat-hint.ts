import "server-only";
// 회화 이야기 방식(talk.lead_mode 'chat', intent 2026-11-13-회화-대화-구조-R spec 설계 7 · 데이터 절 · m-4 (다), plan 묶음 S0)의 힌트 호출 실행과 그 저장.
// 같은 선생님 행의 힌트 호출(힌트 단추 · 막힌 뒤 설명)은 하나로 묶는다: 프로세스 안의 기억으로 묶지 않고(서버 인스턴스가 여럿일 수 있음, C241 보완 2),
// 호출 전에 attempts 에 표지 행(talk-chat-hint:<선생님 행 id>)을 넣어 넣기에 성공한 요청만 부른다. 뒤의 요청은 그 행의 ai_question 이 찰 때까지
// (상한은 힌트 호출의 시간 상한) 기다려 그 값을 낸다. 실패는 표지 행에 적고, 다시 받기는 번호를 붙인 새 표지 행으로 부른다. 실패와 다시 받기의 수는
// 표지 행이 정본이다(ai_question 에 그 칸을 두지 않음 — 컨트롤러 결정 (가), 검토 rev-chat-p35 M6). 6.4 를 지난 칸이 하나도 없어 만든 단이 없는
// 응답도 실패로 센다(컨트롤러 결정 (다), spec 설계 7). 호출 입력의 '나간 say' 는 1~3단계에서 소리 줄로 뺀 문장까지 든 선생님 말 전체다(결정 (나)).
// 화면 응답(chatHintReplyOf · chatExplainReplyOf)과 서버 액션은 묶음 S2 의 몫이다. 아이 이름 · 아이 말 글은 로그에 남기지 않는다.
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { CallSpec, LevelContext } from "@/core/ai/calls/common";
import {
  type ChatHintChildInput,
  type ChatHintContextEntry,
  type ChatHintTierKind,
  type TalkChatHintInput,
  type TalkChatHintOutput,
  talkChatHintSpec,
} from "@/core/ai/calls/talk-chat-hint";
import {
  type ChatHintRecord,
  chatAiQuestionOf,
  chatHintRangeNoteOf,
  chatHintRecordOf,
  chatHintRecordOfRow,
} from "@/core/conversation/chat-hints";
import type { LessonHintSpec } from "@/core/conversation/hints";
import type { LeadLevelInput } from "@/core/conversation/lead-level";
import {
  LEAD_OPEN_ACTIVITY_NO,
  leadConversationOrder,
} from "@/core/conversation/lead-turn-core";
import { readTalkMove } from "@/core/conversation/move";
import { AI_WAIT_TIMEOUT_MULTIPLE } from "@/core/seed/structure";
import { attempts, talkTurns } from "@/db/schema/learning";
import {
  type AiDeps,
  type AiFailureReason,
  type AiOutcome,
  runAiCall,
} from "@/server/ai/run";
import { now } from "@/server/clock";
import { type Db, getDb } from "@/server/db";

// ── 표지 행(spec 데이터 절 attempts 행 · 설계 7 m-4 (다)) ──────────────────────

/** 힌트 호출 표지 행의 갈래(attempts.input.kind · client_attempt_id 머리). */
export const CHAT_HINT_ATTEMPT_KIND = "talk-chat-hint";

function countOf(value: number, what: string): number {
  if (!Number.isInteger(value) || value < 0)
    throw new RangeError(`${what}는 0 이상 정수여야 한다: ${value}`);
  return value;
}

/**
 * 표지 행 id: 첫 받기는 `talk-chat-hint:<선생님 행 id>`, 다시 받기 n 번째는 `talk-chat-hint:<선생님 행 id>:<n>`(C241 보완 2 의 입구 표지와 같은 꼴 —
 * attempts.client_attempt_id 의 유일 제약이 한 요청만 넣게 한다).
 */
export function chatHintAttemptId(teacherRowId: string, retry: number): string {
  countOf(retry, "다시 받기 번호");
  return retry === 0
    ? `${CHAT_HINT_ATTEMPT_KIND}:${teacherRowId}`
    : `${CHAT_HINT_ATTEMPT_KIND}:${teacherRowId}:${retry}`;
}

/**
 * 막힌 뒤 설명 요청의 표지 행 id: `talk-chat-hint:<선생님 행 id>:explain`(힌트 누름과 다른 표지 행 — 설명의 실패가 힌트의 첫 누름 · 다시 받기 수에
 * 닿지 않게, 검토 rev-chat-s0 I-2 · 컨트롤러 결정 (가)). 저장은 같은 선생님 행의 같은 칸(ai_question)이다.
 */
export function chatExplainAttemptId(teacherRowId: string): string {
  return `${CHAT_HINT_ATTEMPT_KIND}:${teacherRowId}:explain`;
}

/** 표지 행의 상태: 부르는 중 · 받아 저장함 · 실패. */
export const CHAT_HINT_MARK_STATES = ["calling", "done", "failed"] as const;
export type ChatHintMarkState = (typeof CHAT_HINT_MARK_STATES)[number];

/**
 * 표지 행의 input(학습 활동이 아님 — 점수 · 아이 말 없음, 입구 표지 LEAD_OPEN_INPUT 과 같은 성격). attempts 를 읽는 자리는 꼴 검사 · id 머리 · 활동
 * 번호로 거르므로 이 행에 닿지 않는다(되돌림 읽기 점검은 묶음 S2). reason 은 실패 갈래(AI 호출 실패 갈래 · 만든 단 없음 · 기다림 끝),
 * rangeOut 은 아는 낱말 범위 밖 낱말(기록 전용 — 단을 막지 않는다, C243 보완 '힌트 범위 막기 없음').
 */
export const ChatHintMarkSchema = z.strictObject({
  v: z.literal(1),
  kind: z.literal(CHAT_HINT_ATTEMPT_KIND),
  retry: z.int().min(0),
  state: z.enum(CHAT_HINT_MARK_STATES),
  /** 막힌 뒤 설명 요청의 표지 행이다(chatExplainAttemptId). */
  explain: z.literal(true).optional(),
  reason: z.string().optional(),
  rangeOut: z.array(z.string()).optional(),
});
export type ChatHintMark = z.infer<typeof ChatHintMarkSchema>;

/** 표지 행 input 을 만든다. */
export function chatHintMarkOf(
  mark: Omit<ChatHintMark, "v" | "kind">,
): ChatHintMark {
  return ChatHintMarkSchema.parse({
    v: 1,
    kind: CHAT_HINT_ATTEMPT_KIND,
    ...mark,
  });
}

// ── 수업 행 읽기(힌트 · 평가 호출 입력이 함께 쓴다) ───────────────────────────

/** 이야기 방식 대화 호출이 도는 토막(인사 · 대화 · 더 이야기하기). 짧은 준비 · 정리 토막의 행은 대화 차례가 아니다. */
export const CHAT_DIALOG_SEGMENTS = ["greeting", "talk", "more_talk"] as const;

/** 힌트 · 평가 · 판정이 읽는 talk_turns 행의 칸(서버 TalkTurnRow 의 일부 — 이름 · 꼴이 같다). */
export type ChatTurnRowLike = {
  id: string;
  turnNo: number;
  segment: string;
  speaker: "child" | "tori";
  text: string | null;
  inputMode: string | null;
  hintLevel: number | null;
  clientListen: unknown;
  sentUserMessage: string | null;
  toriRewrite: string | null;
  aiQuestion: unknown;
  move: unknown;
  chatJudge: unknown;
};

/** 대화 토막의 행만, 대화 차례로(같은 차례 번호면 선생님 행 먼저 — leadConversationOrder). */
export function chatDialogRowsOf<R extends ChatTurnRowLike>(
  rows: readonly R[],
): R[] {
  const dialog: readonly string[] = CHAT_DIALOG_SEGMENTS;
  return leadConversationOrder(
    rows.filter((row) => dialog.includes(row.segment)),
  );
}

/**
 * 수업이 닫힌 뒤에도 남는 칸만으로 다시 세운 선생님 말(검토 rev-chat-t3 I-1 · 5절): 행 글의 첫 줄(말풍선 글 — 앱이 붙인 줄 앞)에 1~3단계에서 소리 줄로
 * 뺀 문장(이야기 방식 move.chat.removed · 지금 새 방식 move.lead.removed)을 더한 글이다. 닫는 거래는 대화 기록 글(tori_rewrite)을 지우지만 행 글과
 * move 는 남기므로, 열린 수업과 닫힌 수업에서 같은 값이다. 뺀 문장은 원래 자리가 아니라 끝에 붙는다(문장 차례는 어림 — 같은 문장들을 담는다).
 */
export function chatSayFromRowOf(
  row: Pick<ChatTurnRowLike, "text"> & { move?: unknown },
): string {
  const shown = ((row.text ?? "").split("\n")[0] ?? "").trim();
  const move = readTalkMove(row.move ?? null);
  const removed = move?.chat?.removed ?? move?.lead?.removed ?? [];
  return [shown, ...removed]
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .join(" ");
}

/**
 * 원문이 지워져 나간 말을 다시 세울 수 없는 선생님 행인가: 대화 기록 글이 없고, 원문 지우기(move.ts eraseTalkMoveText)가 남긴 꼴 — 뺀 문장 칸이 빈
 * 목록이거나 따라 할 문장 글이 빈 글(이야기 방식 move.chat.listen · 지금 새 방식 move.lead.model). 이 칸들은 쓰는 쪽이 값이 있을 때만 두므로(빈 목록 ·
 * 빈 문장으로 쓰지 않음) 빈 값은 지운 표지다. 비교 도구는 이런 행이 있는 수업을 '다시 세울 수 없는 수업'으로 따로 세고, 평가 저장은 그 수업의
 * 판정을 고쳐 쓰지 않는다.
 */
export function chatSaidSayLostOf(
  row: Pick<ChatTurnRowLike, "toriRewrite"> & { move?: unknown },
): boolean {
  if (row.toriRewrite !== null) return false;
  const move = readTalkMove(row.move ?? null);
  const { chat, lead } = move ?? {};
  return (
    chat?.removed?.length === 0 ||
    chat?.listen?.sentence === "" ||
    lead?.removed?.length === 0 ||
    lead?.model?.sentence === ""
  );
}

/**
 * 선생님 행의 나간 say 전체: 대화 기록 글(tori_rewrite — 응답 JSON 에서 문장 문이 바꾼 문장만 나간 글로 바꾼 것)의 say 칸이다. 1~3단계에서 소리 줄로 뺀
 * 따라 할 문장 · 고르기 물음도 든다(아이가 들은 말 전체 — 컨트롤러 결정 (나)). 그 글이 없거나(닫힌 수업) JSON 이 아니면 닫힌 뒤에도 남는 칸으로
 * 다시 세운 글(chatSayFromRowOf — 뺀 문장 포함)이다. move 를 넘기지 않으면 행 글의 첫 줄뿐이다.
 */
export function chatSaidSayOf(
  row: Pick<ChatTurnRowLike, "toriRewrite" | "text"> & { move?: unknown },
): string {
  if (row.toriRewrite !== null) {
    try {
      const parsed: unknown = JSON.parse(row.toriRewrite);
      const say = (parsed as { say?: unknown } | null)?.say;
      if (typeof say === "string") return say;
    } catch {
      // 아래 다시 세운 글로
    }
  }
  return chatSayFromRowOf(row);
}

/**
 * 아이 행의 입력 갈래(대화 호출 입력 줄의 갈래): quiet 행은 조용함, '잘 모르겠어요' 행 가운데 말소리 없음(client_listen.src nospeech)은 눌렀으나
 * 듣지 못함(지금 새 방식과 같은 꼴), 그 밖은 '잘 모르겠어요', 말 행(옛 행의 빈 입력 방식 포함)은 들린 글이다. 들린 글이 빈 말 행은 듣지 못함으로 본다.
 */
export function chatChildInputOf(
  row: Pick<ChatTurnRowLike, "inputMode" | "clientListen" | "text">,
): ChatHintChildInput {
  if (row.inputMode === "quiet") return { kind: "quiet" };
  if (row.inputMode === "dont_know") {
    const src = (row.clientListen as { src?: unknown } | null | undefined)?.src;
    return src === "nospeech" ? { kind: "not_heard" } : { kind: "dont_know" };
  }
  const heard = (row.text ?? "").trim();
  return heard === "" ? { kind: "not_heard" } : { kind: "speech", heard };
}

/**
 * 힌트 호출 입력(spec 설계 7 '호출 입력'): 선생님의 지금 말(그 선생님 행의 나간 say 전체)과 그 앞 대화(대화 토막의 행 — 선생님은 나간 say, 아이는 입력
 * 갈래와 들린 글, 오래된 것부터). 자르기는 규격의 규칙(talk.chat_hint_context_turns)이 한다. 단원 단어 · 목표는 싣지 않는다. 그 선생님 행이 대화 토막에
 * 없으면 null 이다.
 */
export function chatHintInputOf({
  rows,
  teacherRowId,
  level,
  sentenceMaxWords,
  hintTiers,
  teacherNameEn,
}: {
  rows: readonly ChatTurnRowLike[];
  teacherRowId: string;
  level: number;
  sentenceMaxWords: number;
  hintTiers: readonly ChatHintTierKind[];
  teacherNameEn: string;
}): TalkChatHintInput | null {
  const dialog = chatDialogRowsOf(rows);
  const at = dialog.findIndex(
    (row) => row.id === teacherRowId && row.speaker === "tori",
  );
  const teacher = dialog[at];
  if (teacher === undefined) return null;
  const context: ChatHintContextEntry[] = dialog
    .slice(0, at)
    .map((row) =>
      row.speaker === "tori"
        ? { speaker: "teacher", say: chatSaidSayOf(row) }
        : { speaker: "child", input: chatChildInputOf(row) },
    );
  return {
    level,
    sentenceMaxWords,
    hintTiers: [...hintTiers],
    teacherNameEn,
    say: chatSaidSayOf(teacher),
    context,
  };
}

// ── 호출 실행(runAiCall 의 단계 맥락 꼴) ───────────────────────────────────

/**
 * runAiCall 은 입력에 단계 맥락 칸(LevelContext)을 바란다(단계 · 문장 낱말 상한만 읽음). 이야기 방식의 힌트 · 평가 입력에는 그 칸이 없어, 빈 맥락 칸을
 * 덧대고 가림이 덧댄 칸을 그대로 두게 한 규격이다. 안내문 · 메시지는 원래 규격 그대로 만든다.
 */
export function levelCallSpecOf<I, O, R>(
  spec: CallSpec<I, O, R>,
): CallSpec<I & LevelContext, O, R> {
  return {
    ...spec,
    mask: (input, masker) => ({ ...input, ...spec.mask(input, masker) }),
  };
}

/** 입력에 단계 맥락 칸을 덧댄다(입력의 같은 이름 칸이 이긴다 — 평가 입력의 단원 단어). */
export function levelInputOf<I extends object>(
  input: I,
  { level, sentenceMaxWords }: { level: number; sentenceMaxWords: number },
): I & LevelContext {
  return {
    canDo: "",
    learningElement: "",
    prevLearningElements: [],
    unitWords: [],
    ...input,
    level,
    sentenceMaxWords,
  } as I & LevelContext;
}

// ── 묶음 · 기다림 · 다시 받기(spec 설계 7 '실패와 다시 받기' · m-4 (다)) ──────────────

/** 뒤의 요청이 ai_question 이 찼는지 다시 보는 간격(기술 값 — 설계 숫자가 아니다). */
export const CHAT_HINT_POLL_MS = 200;

/**
 * 실패 갈래: AI 호출 실패 갈래 · 만든 단 없음 · 기다림 상한 · 'AI 쉬는 중' · 다시 받기 상한 넘음 · 저장하지 못함(선생님 행 ai_question 에 다른 꼴의
 * 값이 있어 쓰지 못했고 다시 읽은 값도 없음 — 검토 rev-chat-s0 M-1).
 */
export type ChatHintFailure =
  | AiFailureReason
  | "no_tiers"
  | "wait_timeout"
  | "resting"
  | "retry_max"
  | "not_saved";

export type ChatHintResult =
  | {
      ok: true;
      record: ChatHintRecord;
      /** 저장된 것을 냄 · 이 요청이 불러 저장함 · 앞 요청을 기다려 받음. */
      via: "stored" | "called" | "waited";
    }
  | {
      ok: false;
      reason: ChatHintFailure;
      /** 그 선생님 행에서 이미 쓴 다시 받기 수(chatHintReplyOf 의 retriesUsed — 이 요청의 다시 받기 번호). */
      retriesUsed: number;
    };

export type ChatHintRequest = {
  teacherRowId: string;
  /** 힌트 누름(기본) · 막힌 뒤 설명 요청. 설명은 제 표지 행(chatExplainAttemptId)을 쓰고 다시 받기가 없다(retry 를 보지 않음). */
  kind?: "hint" | "explain";
  /** 힌트의 다시 받기 번호(0 = 첫 누름, n = 화면의 n 번째 '다시 받기'). */
  retry: number;
  /** talk.chat_hint_retry_max. */
  retryMax: number;
  /** 뒤의 요청이 기다리는 상한(힌트 호출의 시간 상한 ai.timeout_seconds.realtime, 밀리초). */
  waitMs: number;
  /** 'AI 쉬는 중'이면 부르지 않는다(저장된 단은 낸다). */
  aiResting: boolean;
  /** 단계 규격(단 차례 · 거르개 구간). */
  spec: LessonHintSpec;
  /** 틀 단 재료를 찾는 단원 단어(호출 입력에는 싣지 않는다). */
  unitWords: readonly string[];
  lemmaOf: (surface: string) => string | undefined;
  /** 아는 낱말 범위(기록 전용, 없으면 적지 않음). */
  range?: LeadLevelInput;
};

/** 힌트 실행이 닿는 저장(DB 판은 chatHintStoreOf — 단위 시험은 가짜로 갈음한다). */
export type ChatHintStore = {
  /** 그 선생님 행의 저장된 힌트 재료(이야기 방식 꼴이 아니거나 아직 없으면 null). */
  stored(): Promise<ChatHintRecord | null>;
  /** 표지 행을 넣는다. 넣었으면 참(같은 id 가 있으면 거짓). */
  claim(id: string, mark: ChatHintMark, at: Date): Promise<boolean>;
  /** 표지 행의 값과 시각. 없으면 null. */
  mark(id: string): Promise<{ mark: ChatHintMark | null; at: Date } | null>;
  /** 끊긴 표지 행을 고쳐 잡는다: 읽은 시각이 그대로일 때만 이 요청의 시각 · 부르는 중으로(한 요청만 성공). */
  retake(
    id: string,
    prior: Date,
    mark: ChatHintMark,
    at: Date,
  ): Promise<boolean>;
  /**
   * 받은 값을 저장한다(한 거래): 선생님 행 ai_question 이 비었을 때만 쓴다. 썼거나 이미 이야기 방식 값이 있으면 표지 행을 받음(mark)으로 두고 참,
   * 쓰지 못했고 다시 읽은 값도 없으면 표지 행을 실패(not_saved)로 두고 거짓(검토 rev-chat-s0 M-1).
   */
  save(
    id: string,
    record: ChatHintRecord,
    mark: ChatHintMark,
  ): Promise<boolean>;
  /** 표지 행에 실패를 적는다. */
  fail(id: string, mark: ChatHintMark): Promise<void>;
};

export type ChatHintIo = {
  store: ChatHintStore;
  /** 힌트 호출 하나(DB 판은 runAiCall — 목적 talk_chat_hint). */
  call(): Promise<AiOutcome<TalkChatHintOutput>>;
  clock: () => Date;
  sleep: (ms: number) => Promise<void>;
  /** 기다림 간격(없으면 CHAT_HINT_POLL_MS). */
  pollMs?: number;
};

/**
 * 같은 선생님 행의 힌트 받기 하나(spec 설계 7). 저장된 단이 있으면 그것을 낸다(선생님 행당 1회). 없으면 'AI 쉬는 중' · 다시 받기 상한을 본 뒤 표지 행을
 * 넣어 넣기에 성공한 요청만 부른다. 이미 있는 표지 행이 부르는 중이고 호출의 기다림 상한(시간 상한의 AI_WAIT_TIMEOUT_MULTIPLE 배 — 다시 시도까지 든
 * 한 호출의 끝)이 지났으면 끊긴 표지로 보고 고쳐 잡는다(C241 보완 2 의 입구 표지와 같은 꼴). 못 넣은 요청은 ai_question 이 찰 때까지 waitMs 동안
 * 기다리고, 그 사이 표지 행이 실패면 실패를 낸다. 응답은 6.4 를 지난 칸으로 단을 만들고(chatHintRecordOf), 만든 단이 없으면 실패다.
 *
 * 막힌 뒤 설명(kind explain)은 힌트와 다른 표지 행으로 묶는다(검토 rev-chat-s0 I-2 · 컨트롤러 결정 (가)): 설명의 실패는 힌트의 첫 누름 · 다시 받기
 * 수를 쓰지 않는다. 같은 선생님 행에 호출이 겹치지 않게, 힌트 누름은 설명 호출이 부르는 중이면 그것을 기다려 저장된 값을 쓰고, 그 호출이 실패로
 * 끝났으면 제 표지 행으로 한 번 부른다. 설명 요청도 힌트 첫 누름(번호 0)이 부르는 중이면 그것을 기다리고, 그 호출이 실패했으면 부르지 않는다.
 */
export async function chatHintRun(
  req: ChatHintRequest,
  io: ChatHintIo,
): Promise<ChatHintResult> {
  const explain = req.kind === "explain";
  const retry = explain ? 0 : countOf(req.retry, "다시 받기 번호");
  const retryMax = countOf(req.retryMax, "다시 받기 상한");
  const stored = await io.store.stored();
  if (stored !== null) return { ok: true, record: stored, via: "stored" };
  if (req.aiResting)
    return { ok: false, reason: "resting", retriesUsed: retry };
  if (retry > retryMax)
    return { ok: false, reason: "retry_max", retriesUsed: retryMax };

  const staleMs = AI_WAIT_TIMEOUT_MULTIPLE * req.waitMs;
  const live = (prior: { mark: ChatHintMark | null; at: Date } | null) =>
    prior !== null &&
    prior.mark?.state === "calling" &&
    io.clock().getTime() - prior.at.getTime() < staleMs;

  // 같은 선생님 행의 다른 갈래(힌트 ↔ 설명) 호출이 부르는 중이면 그 호출을 기다린다. 설명 요청과 힌트의 첫 누름(번호 0)만 기다리고, 다시 받기는
  // 아이가 이미 한 번 기다린 뒤라 기다리지 않고 제 표지 행으로 부른다(검토 rev-chat-s0-2 N-2). 두 요청이 같은 순간에 오면(둘 다 다른 갈래의 표지를
  // 보기 전에 제 표지를 넣음) 호출이 둘 나갈 수 있다 — 알고 둔다(N-1, 켜기 전 관문이 같은 선생님 행의 힌트 호출이 둘인 차례 수를 봄)
  const otherId = explain
    ? chatHintAttemptId(req.teacherRowId, 0)
    : chatExplainAttemptId(req.teacherRowId);
  if ((explain || retry === 0) && live(await io.store.mark(otherId))) {
    const waited = await waitFor(otherId, req, io, retry);
    // 받았거나 · 기다림 상한까지 그 호출이 끝나지 않았거나(겹쳐 부르지 않음) · 설명 요청이면 그 결과를 낸다. 힌트 누름은 그 호출이 실패로 끝났을
    // 때만 제 표지 행으로 넘어간다
    if (waited.ok || explain || waited.reason === "wait_timeout") return waited;
  }

  const id = explain
    ? chatExplainAttemptId(req.teacherRowId)
    : chatHintAttemptId(req.teacherRowId, retry);
  const flag = explain ? { explain: true as const } : {};
  const markOf = (mark: Omit<ChatHintMark, "v" | "kind" | "retry">) =>
    chatHintMarkOf({ retry, ...flag, ...mark });
  const calling = markOf({ state: "calling" });
  const at = io.clock();
  let owner = await io.store.claim(id, calling, at);
  if (!owner) {
    const prior = await io.store.mark(id);
    if (
      prior !== null &&
      prior.mark?.state === "calling" &&
      at.getTime() - prior.at.getTime() >= staleMs
    )
      owner = await io.store.retake(id, prior.at, calling, at);
  }
  if (!owner) return waitFor(id, req, io, retry);

  const outcome = await io.call();
  if (!outcome.ok) {
    await io.store.fail(
      id,
      markOf({ state: "failed", reason: outcome.reason }),
    );
    return { ok: false, reason: outcome.reason, retriesUsed: retry };
  }
  const record = chatHintRecordOf({
    output: outcome.value,
    spec: req.spec,
    unitWords: req.unitWords,
    lemmaOf: req.lemmaOf,
  });
  const rangeOut =
    req.range === undefined
      ? undefined
      : chatHintRangeNoteOf({
          hintEn: outcome.value.hint_en,
          range: req.range,
        });
  const extra = rangeOut === undefined ? {} : { rangeOut };
  if (record.tiers.length === 0) {
    await io.store.fail(
      id,
      markOf({ state: "failed", reason: "no_tiers", ...extra }),
    );
    return { ok: false, reason: "no_tiers", retriesUsed: retry };
  }
  const saved = await io.store.save(
    id,
    record,
    markOf({ state: "done", ...extra }),
  );
  if (!saved) return { ok: false, reason: "not_saved", retriesUsed: retry };
  // 다른 요청이 먼저 저장했으면(끊긴 표지를 고쳐 잡은 요청과 겹침) 저장된 값을 낸다 — 같은 선생님 행의 단이 둘로 갈리지 않게
  const read = await io.store.stored();
  return { ok: true, record: read ?? record, via: "called" };
}

/**
 * 표지 행 id 의 호출을 기다린다(waitMs 까지): ai_question 이 차면 그 값, 표지 행이 실패면 그 실패, 표지 행이 받음인데 단이 없으면(저장되지 못한 꼴)
 * 상한까지 기다리지 않고 곧바로 not_saved 실패다(검토 rev-chat-s0 M-1).
 */
async function waitFor(
  id: string,
  req: ChatHintRequest,
  io: ChatHintIo,
  retry: number,
): Promise<ChatHintResult> {
  const pollMs = io.pollMs ?? CHAT_HINT_POLL_MS;
  const deadline = io.clock().getTime() + req.waitMs;
  for (;;) {
    const stored = await io.store.stored();
    if (stored !== null) return { ok: true, record: stored, via: "waited" };
    const prior = await io.store.mark(id);
    if (prior?.mark?.state === "failed")
      return {
        ok: false,
        reason: (prior.mark.reason as ChatHintFailure | undefined) ?? "server",
        retriesUsed: retry,
      };
    if (prior?.mark?.state === "done") {
      // 받음 표지와 ai_question 쓰기는 한 거래라, 받음인데 값이 없으면 저장되지 못한 것이다 — 한 번 더 읽어 확인한다
      const again = await io.store.stored();
      return again !== null
        ? { ok: true, record: again, via: "waited" }
        : { ok: false, reason: "not_saved", retriesUsed: retry };
    }
    const left = deadline - io.clock().getTime();
    if (left <= 0)
      return { ok: false, reason: "wait_timeout", retriesUsed: retry };
    await io.sleep(Math.min(pollMs, left));
  }
}

// ── DB 판 ─────────────────────────────────────────────────────────

/** 힌트 실행의 DB 저장: 그 수업 · 그 선생님 행에만 닿는다. */
export function chatHintStoreOf(
  db: Db,
  {
    sessionId,
    teacherRowId,
    spec,
  }: {
    sessionId: string;
    teacherRowId: string;
    spec: Pick<LessonHintSpec, "band">;
  },
): ChatHintStore {
  const teacherRow = and(
    eq(talkTurns.id, teacherRowId),
    eq(talkTurns.sessionId, sessionId),
    eq(talkTurns.speaker, "tori"),
  );
  return {
    async stored() {
      const [row] = await db
        .select({ aiQuestion: talkTurns.aiQuestion })
        .from(talkTurns)
        .where(teacherRow);
      return row === undefined
        ? null
        : chatHintRecordOfRow(row.aiQuestion, spec);
    },
    async claim(id, mark, at) {
      const claimed = await db
        .insert(attempts)
        .values({
          sessionId,
          clientAttemptId: id,
          activityNo: LEAD_OPEN_ACTIVITY_NO,
          input: mark,
          attemptedAt: at,
          status: "done",
        })
        .onConflictDoNothing({ target: attempts.clientAttemptId })
        .returning({ id: attempts.id });
      return claimed.length > 0;
    },
    async mark(id) {
      const [row] = await db
        .select({ input: attempts.input, at: attempts.attemptedAt })
        .from(attempts)
        .where(
          and(
            eq(attempts.clientAttemptId, id),
            eq(attempts.sessionId, sessionId),
          ),
        );
      if (row === undefined) return null;
      const parsed = ChatHintMarkSchema.safeParse(row.input);
      return { mark: parsed.success ? parsed.data : null, at: row.at };
    },
    async retake(id, prior, mark, at) {
      const moved = await db
        .update(attempts)
        .set({ attemptedAt: at, input: mark })
        .where(
          and(
            eq(attempts.clientAttemptId, id),
            eq(attempts.sessionId, sessionId),
            eq(attempts.attemptedAt, prior),
          ),
        )
        .returning({ id: attempts.id });
      return moved.length > 0;
    },
    async save(id, record, mark) {
      return db.transaction(async (tx) => {
        const wrote = await tx
          .update(talkTurns)
          .set({ aiQuestion: chatAiQuestionOf(record) })
          .where(and(teacherRow, isNull(talkTurns.aiQuestion)))
          .returning({ id: talkTurns.id });
        let ok = wrote.length > 0;
        if (!ok) {
          // 쓰지 못했다: 다른 요청이 먼저 이야기 방식 값을 썼으면 받음, 아니면(다른 꼴의 값 · 행 없음) 저장 못 함
          const [row] = await tx
            .select({ aiQuestion: talkTurns.aiQuestion })
            .from(talkTurns)
            .where(teacherRow);
          ok =
            row !== undefined &&
            chatHintRecordOfRow(row.aiQuestion, spec) !== null;
        }
        await tx
          .update(attempts)
          .set({
            input: ok
              ? mark
              : chatHintMarkOf({
                  ...mark,
                  state: "failed",
                  reason: "not_saved",
                }),
          })
          .where(
            and(
              eq(attempts.clientAttemptId, id),
              eq(attempts.sessionId, sessionId),
            ),
          );
        return ok;
      });
    },
    async fail(id, mark) {
      await db
        .update(attempts)
        .set({ input: mark })
        .where(
          and(
            eq(attempts.clientAttemptId, id),
            eq(attempts.sessionId, sessionId),
          ),
        );
    },
  };
}

/**
 * 힌트 받기(서버 액션 · 막힌 뒤 설명 요청이 부른다 — 묶음 S2). 호출은 runAiCall(목적 talk_chat_hint — 자기 ai.* 키 · ai.timeout_seconds.realtime ·
 * 하루 안전 상한 · 시도 기록, 실패는 8절 'AI 호출 하나의 실패'로 셈)이다. 입력은 chatHintInputOf 로 만든다.
 */
export async function requestChatHint(
  req: ChatHintRequest & {
    profileId: string | null;
    sessionId: string;
    input: TalkChatHintInput;
  },
  deps: AiDeps & { sleep?: (ms: number) => Promise<void> } = {},
): Promise<ChatHintResult> {
  const db = deps.db ?? getDb();
  const clock = deps.clock ?? now;
  const { input } = req;
  return chatHintRun(req, {
    store: chatHintStoreOf(db, {
      sessionId: req.sessionId,
      teacherRowId: req.teacherRowId,
      spec: req.spec,
    }),
    call: () =>
      runAiCall(
        levelCallSpecOf(talkChatHintSpec),
        levelInputOf(input, input),
        {
          profileId: req.profileId,
          sessionId: req.sessionId,
          level: input.level,
        },
        { ...deps, db, clock },
      ),
    clock,
    sleep:
      deps.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))),
  });
}

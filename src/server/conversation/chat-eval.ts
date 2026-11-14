import "server-only";
// 회화 이야기 방식(talk.lead_mode 'chat', intent 2026-11-13-회화-대화-구조-R spec 설계 8-2 · 8-4 · 13 '수업별 비교 기록', plan 묶음 S0)의 평가 호출 실행과
// 그 저장 · 수업별 비교 표지 행. 기록 전용이다: 결과는 아이 행의 chat_judge 와 attempts 표지 행(talk-chat-compare:<세션 id>)에만 쓰고, said_words ·
// '안다' · 단원 통과 · 승급 · 이어하기 · 흐름의 입력이 아니다(AC-8). 이 호출의 실패와 성공은 'AI 쉬는 중'의 이어진 실패 셈 밖이다(store.ts
// purposeCountsTowardDown). 실패 · 시간 넘음 · 검증 실패는 '판정 없음'으로 적고 다시 부르지 않는다.
// 늦게 온 값은 그 값에 기대는 뒤 행도 바꾸므로, 평가 값의 저장 · 수업 행 읽기 · 다시 세기(chatJudgeChangesOf) · 고쳐 쓰기를 한 거래 안에서 세션 행
// 잠금으로 수업 단위로 줄 세운다(검토 rev-chat-p4 I-3 · rev-chat-p4-2 — 두 값이 함께 와도 뒤에 쓴 쪽이 앞의 값을 모르고 덮지 않게). 부를 차례의
// 판단은 P3 의 함수(chatEvalAfterTeacherOf · chatEvalOnCloseOf), 판정 · 비교는 P4 의 함수다. 응답 뒤 작업(after) · 닫는 길에서 부르는 일은 묶음 S1 · S2.
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  type ChatEvalEntry,
  type TalkChatEvalInput,
  type TalkChatEvalOutput,
  talkChatEvalInputOf,
  talkChatEvalSpec,
} from "@/core/ai/calls/talk-chat-eval";
import {
  ChatCompareSummarySchema,
  chatCompareOf,
} from "@/core/conversation/chat-compare";
import { chatHintRecordOfRow } from "@/core/conversation/chat-hints";
import {
  type ChatEvalFailure,
  type ChatEvalState,
  type ChatJudge,
  type ChatJudgeContext,
  type ChatJudgeInputKind,
  type ChatJudgeRow,
  chatJudgeChangesOf,
  readChatJudge,
} from "@/core/conversation/chat-judge";
import { chatInputLineOf } from "@/core/conversation/chat-message";
import {
  chatEvalAfterTeacherOf,
  chatEvalDueOf,
  chatEvalOnCloseOf,
} from "@/core/conversation/chat-turn-core";
import { LEAD_OPEN_ACTIVITY_NO } from "@/core/conversation/lead-turn-core";
import { readTalkMove } from "@/core/conversation/move";
import { attempts, sessions, talkTurns } from "@/db/schema/learning";
import {
  type AiDeps,
  type AiFailureReason,
  type AiOutcome,
  runAiCall,
} from "@/server/ai/run";
import { now } from "@/server/clock";
import {
  type ChatTurnRowLike,
  chatChildInputOf,
  chatDialogRowsOf,
  chatSaidSayLostOf,
  chatSaidSayOf,
  chatSayFromRowOf,
  levelCallSpecOf,
  levelInputOf,
} from "@/server/conversation/chat-hint";
import { type DbOrTx, getDb } from "@/server/db";
import { dbErrorTag } from "@/server/db/safe-error";

// ── 평가 입력 · 상태(spec 설계 8-2 '입력' · 8-4) ─────────────────────────────

/**
 * 대화 토막의 행(대화 차례로 둔 것 — chatDialogRowsOf)을 평가 호출의 기록 꼴로 옮긴다: 아이 쪽은 그 차례에 대화 호출로 보낸 사용자 메시지 글 그대로
 * (아이 행의 sent_user_message. 입구 차례 start · more · back 은 아이 행이 없어 그 선생님 행의 sent_user_message), 선생님 쪽은 나간 say 전체.
 * 사용자 메시지가 남지 않은 아이 행(호출 전에 닫힌 마지막 차례)은 입력 줄을 다시 만든다(사실 줄 없음). childAt 은 아이 행 id → 차례 번호다.
 * 수업이 닫힌 뒤(closing.ts clearSentMessages 가 대화 기록 글 · 보낸 사용자 메시지를 지움)에는: 선생님 말은 행 글 + 뺀 문장으로 다시 세운 글이고
 * (chatSaidSayOf — 뺀 문장은 끝에 붙음), 아이 쪽 줄은 입력 줄을 다시 만든 글이라 사실 줄 · 인식기 알림 줄이 없으며, 입구 차례(start · more · back)의
 * 사용자 메시지 줄은 빠진다. 이 차이는 알고 둔다(검토 rev-chat-t3 I-1 뒤 컨트롤러 결정 — 판정 행은 이 차이에 닿지 않음).
 */
export function chatEvalEntriesOf(rows: readonly ChatTurnRowLike[]): {
  entries: ChatEvalEntry[];
  childAt: Map<string, number>;
} {
  const entries: ChatEvalEntry[] = [];
  const childAt = new Map<string, number>();
  for (const row of rows) {
    if (row.speaker === "child") {
      childAt.set(row.id, entries.length);
      entries.push({
        speaker: "child",
        message: row.sentUserMessage ?? chatInputLineOf(chatChildInputOf(row)),
      });
      continue;
    }
    if (row.sentUserMessage !== null)
      entries.push({ speaker: "child", message: row.sentUserMessage });
    entries.push({ speaker: "teacher", say: chatSaidSayOf(row) });
  }
  return { entries, childAt };
}

/** 아이 행 하나의 평가 입력(talkChatEvalInputOf — n 앞 contextTurns 차례 · n · n+1). 그 행이 대화 토막의 아이 행이 아니면 null. */
export function chatEvalInputFor({
  rows,
  childRowId,
  contextTurns,
  unitWords,
}: {
  rows: readonly ChatTurnRowLike[];
  childRowId: string;
  /** talk.chat_eval_context_turns. */
  contextTurns: number;
  unitWords: readonly string[];
}): TalkChatEvalInput | null {
  const { entries, childAt } = chatEvalEntriesOf(chatDialogRowsOf(rows));
  const at = childAt.get(childRowId);
  if (at === undefined) return null;
  return talkChatEvalInputOf({ entries, at, contextTurns, unitWords });
}

/**
 * 아이 행의 평가 상태: 저장된 chat_judge 의 기존 꼴 상태와 출력. chat_judge 가 아직 없으면(옛 행 · 행 저장 전의 값) 말 입력 차례는 기다림, 그 밖은
 * 부르지 않음이다(P3 chatEvalDueOf). 있음인데 출력이 없는 값은 판정 없음으로 본다.
 */
export function chatEvalStateOf(
  row: Pick<
    ChatTurnRowLike,
    "chatJudge" | "inputMode" | "clientListen" | "text"
  >,
): ChatEvalState {
  const judge = readChatJudge(row.chatJudge);
  if (judge !== null) {
    const { status, output, failure } = judge.legacy;
    if (status === "failed")
      return failure === undefined ? { status } : { status, failure };
    if (status !== "done") return { status };
    return output === null ? { status: "failed" } : { status: "done", output };
  }
  return chatEvalDueOf(chatChildInputOf(row))
    ? { status: "waiting" }
    : { status: "not_called" };
}

/** 이 행이 아직 평가 값을 기다리는 아이 행인가(조건부 고쳐 쓰기의 조건 — 두 번 쓰지 않음, plan 열린 것 7). */
export function chatEvalPendingOf(row: ChatTurnRowLike): boolean {
  return row.speaker === "child" && chatEvalStateOf(row).status === "waiting";
}

/** 원문이 지워져 나간 말을 다시 세울 수 없는 대화 토막 선생님 행이 있는 수업인가(chatSaidSayLostOf). */
export function chatLessonSayLostOf(rows: readonly ChatTurnRowLike[]): boolean {
  return chatDialogRowsOf(rows).some(
    (row) => row.speaker === "tori" && chatSaidSayLostOf(row),
  );
}

/** 판정 없음의 까닭(시간 넘음 · 검증 실패 · 그 밖 — 검토 rev-chat-p4 5절, 값 목록은 chat-judge CHAT_EVAL_FAILURES). */
export type { ChatEvalFailure };

/** AI 호출 실패 갈래 → 판정 없음의 까닭. 읽지 못함 · 출력 막힘은 검증 실패다. */
export function chatEvalFailureOf(reason: AiFailureReason): ChatEvalFailure {
  if (reason === "timeout") return "timeout";
  if (reason === "invalid" || reason === "output_blocked") return "invalid";
  return "other";
}

// ── 판정 행 · 저장 계산(P4 chatJudgeChangesOf) ───────────────────────────────

/** 아이 행의 입력 갈래(판정 꼴). */
function judgeInputOf(row: ChatTurnRowLike): ChatJudgeInputKind {
  return chatChildInputOf(row).kind;
}

/**
 * 판정 함수에 넘기는 행: 대화 토막의 행만, 평가 입력과 같은 차례로(정리 · 짧은 준비 토막 행을 섞지 않음 — rows[at+1] 이 평가의 n+1 과 같은 행).
 * 선생님 행은 나간 say 전체 · 따라 할 문장(move.chat.listen 이 say 에 든 때만) · 막힌 뒤 설명을 보였는지 · 마무리 자리 · 대화 첫 선생님 행, 아이 행은
 * 입력 갈래 · 들린 글 · 바로 앞 선생님 행의 힌트 단 가운데 연 단(hint_level 만큼)의 종류 · 평가 상태다. 한국어 도움은 그 가지가 합쳐진 뒤 채운다(null).
 * override 는 저장 전의 새 평가 값(그 아이 행의 상태를 바꿔 센다). ids 는 판정 행 번호 → talk_turns id, stored 는 아이 행 번호 → 저장된 chat_judge 다.
 */
export function chatJudgeRowsOf(
  rows: readonly ChatTurnRowLike[],
  spec: ChatJudgeContext["spec"],
  override?: { id: string; state: ChatEvalState },
): { rows: ChatJudgeRow[]; ids: string[]; stored: Map<number, unknown> } {
  const dialog = chatDialogRowsOf(rows);
  const out: ChatJudgeRow[] = [];
  const ids: string[] = [];
  const stored = new Map<number, unknown>();
  let prevTeacher: ChatTurnRowLike | null = null;
  for (const row of dialog) {
    ids.push(row.id);
    if (row.speaker === "tori") {
      const move = readTalkMove(row.move);
      const listen = move?.chat?.listen;
      out.push({
        role: "teacher",
        // 닫힌 뒤에도 남는 칸만으로 만든 글(열린 수업과 닫힌 수업의 다시 세기가 같은 값을 내게 — 검토 rev-chat-t3 I-1)
        say: chatSayFromRowOf(row),
        listenSentence: listen?.inSay === true ? listen.sentence : null,
        explainShown: move?.chat?.explain === true,
        closing: move?.kind === "closing_slot",
        first: move?.kind === "first_question",
      });
      prevTeacher = row;
      continue;
    }
    const input = judgeInputOf(row);
    const tiers =
      prevTeacher === null
        ? []
        : (chatHintRecordOfRow(prevTeacher.aiQuestion, spec)?.tiers ?? []);
    stored.set(out.length, row.chatJudge);
    out.push({
      role: "child",
      input,
      heard: input === "speech" ? (row.text ?? "").trim() : "",
      opened: tiers.slice(0, row.hintLevel ?? 0).map((tier) => tier.kind),
      koHelp: null,
      eval:
        override !== undefined && override.id === row.id
          ? override.state
          : chatEvalStateOf(row),
    });
  }
  return { rows: out, ids, stored };
}

/**
 * 새 평가 값의 쓰기(한 거래 안에서 부른다): 그 아이 행이 아직 기다림이면 그 값을 넣은 행으로 수업 전체를 다시 세어(chatJudgeChangesOf) 저장값과 다른
 * 아이 행 전부를 돌려준다 — 그 평가의 행과 그 값에 기대는 뒤 행(들은 도움 · 되물은 뒤 이어 받기 · 출처). 그 행이 없거나 이미 기다림이 아니면(다른 요청이
 * 먼저 씀) null 이다(두 번 쓰지 않음).
 */
export function chatEvalWritesOf({
  rows,
  childRowId,
  state,
  ctx,
}: {
  rows: readonly ChatTurnRowLike[];
  childRowId: string;
  state: ChatEvalState;
  ctx: ChatJudgeContext;
}): { id: string; judge: ChatJudge }[] | null {
  const target = rows.find(
    (row) => row.id === childRowId && row.speaker === "child",
  );
  if (target === undefined || !chatEvalPendingOf(target)) return null;
  // 원문이 지워진 수업은 다시 셀 재료가 없어 저장된 판정을 고쳐 쓰지 않는다(가장 보수적인 쪽)
  if (chatLessonSayLostOf(rows)) return null;
  const judged = chatJudgeRowsOf(rows, ctx.spec, { id: childRowId, state });
  if (!judged.ids.includes(childRowId)) return null;
  return chatJudgeChangesOf({
    rows: judged.rows,
    stored: judged.stored,
    ctx,
  }).map(({ row, judge }) => ({ id: judged.ids[row] ?? "", judge }));
}

// ── 수업별 비교 표지 행(spec 설계 13 '수업별 비교 기록') ───────────────────────

/** 비교 표지 행의 갈래(attempts.input.kind · client_attempt_id 머리). */
export const CHAT_COMPARE_ATTEMPT_KIND = "talk-chat-compare";

/** 비교 표지 행 id(수업 하나에 하나). */
export function chatCompareAttemptId(sessionId: string): string {
  return `${CHAT_COMPARE_ATTEMPT_KIND}:${sessionId}`;
}

/** 비교 표지 행의 input(학습 활동이 아님 — 아이 말 글 없음, 행 번호만). */
export const ChatCompareMarkSchema = z.strictObject({
  v: z.literal(1),
  kind: z.literal(CHAT_COMPARE_ATTEMPT_KIND),
  summary: ChatCompareSummarySchema,
});
export type ChatCompareMark = z.infer<typeof ChatCompareMarkSchema>;

/** 비교에 넘기는 행: 대화 토막의 아이 행 가운데 chat_judge 가 있는 행(차례 번호와 저장된 판정). */
export function chatCompareRowsOf(
  rows: readonly ChatTurnRowLike[],
): { row: number; judge: ChatJudge }[] {
  return chatDialogRowsOf(rows).flatMap((row) => {
    if (row.speaker !== "child") return [];
    const judge = readChatJudge(row.chatJudge);
    return judge === null ? [] : [{ row: row.turnNo, judge }];
  });
}

/** 실제 수업의 비교 표지 행 값(source 'real' — 모의 수업은 대본 도구가 따로 센다). homophones 는 판정에 쓴 동음이의어 묶음 그대로다. */
export function chatCompareMarkOf({
  rows,
  met,
  homophones,
}: {
  rows: readonly ChatTurnRowLike[];
  met: readonly string[];
  homophones: readonly (readonly string[])[];
}): ChatCompareMark {
  return {
    v: 1,
    kind: CHAT_COMPARE_ATTEMPT_KIND,
    summary: chatCompareOf({
      rows: chatCompareRowsOf(rows),
      met,
      source: "real",
      homophones,
    }),
  };
}

// ── DB 판 ─────────────────────────────────────────────────────────

const ROW_COLUMNS = {
  id: talkTurns.id,
  turnNo: talkTurns.turnNo,
  segment: talkTurns.segment,
  speaker: talkTurns.speaker,
  text: talkTurns.text,
  inputMode: talkTurns.inputMode,
  hintLevel: talkTurns.hintLevel,
  clientListen: talkTurns.clientListen,
  sentUserMessage: talkTurns.sentUserMessage,
  toriRewrite: talkTurns.toriRewrite,
  aiQuestion: talkTurns.aiQuestion,
  move: talkTurns.move,
  chatJudge: talkTurns.chatJudge,
};

async function readChatRows(
  db: DbOrTx,
  sessionId: string,
): Promise<ChatTurnRowLike[]> {
  return db
    .select(ROW_COLUMNS)
    .from(talkTurns)
    .where(eq(talkTurns.sessionId, sessionId));
}

/** 수업 단위 줄 세우기: 거래 안에서 그 세션 행을 잠근다(같은 수업의 쓰기는 차례로). */
async function lockSession(tx: DbOrTx, sessionId: string): Promise<void> {
  await tx
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .for("update");
}

function withWrites(
  rows: readonly ChatTurnRowLike[],
  writes: readonly { id: string; judge: ChatJudge }[],
): ChatTurnRowLike[] {
  const byId = new Map(writes.map((w) => [w.id, w.judge]));
  return rows.map((row) =>
    byId.has(row.id) ? { ...row, chatJudge: byId.get(row.id) } : row,
  );
}

/** 비교 표지 행을 쓴다(없으면 넣고, 있으면 고쳐 씀 — 거래 안에서 부른다). */
async function upsertCompare(
  tx: DbOrTx,
  sessionId: string,
  mark: ChatCompareMark,
  at: Date,
): Promise<void> {
  await tx
    .insert(attempts)
    .values({
      sessionId,
      clientAttemptId: chatCompareAttemptId(sessionId),
      activityNo: LEAD_OPEN_ACTIVITY_NO,
      input: mark,
      attemptedAt: at,
      status: "done",
    })
    .onConflictDoUpdate({
      target: attempts.clientAttemptId,
      set: { input: mark, attemptedAt: at },
    });
}

/** 이미 있는 비교 표지 행(꼴이 틀리면 null). */
async function readCompare(
  tx: DbOrTx,
  sessionId: string,
): Promise<ChatCompareMark | null> {
  const [row] = await tx
    .select({ input: attempts.input })
    .from(attempts)
    .where(
      and(
        eq(attempts.clientAttemptId, chatCompareAttemptId(sessionId)),
        eq(attempts.sessionId, sessionId),
      ),
    );
  if (row === undefined) return null;
  const parsed = ChatCompareMarkSchema.safeParse(row.input);
  return parsed.success ? parsed.data : null;
}

/**
 * 새 평가 값을 한 거래에서 쓴다: 세션 행 잠금 → 수업 행 읽기 → 다시 세기 → 바뀐 아이 행 고쳐 쓰기. 수업이 닫혀 비교 표지 행이 이미 있으면(닫힌 뒤 늦게
 * 온 값, M-6) 같은 거래에서 표지 행도 다시 센다(만남 낱말은 표지 행에 적힌 값 그대로). 쓰지 않았으면(이미 기다림이 아님) 거짓.
 */
export async function writeChatEval(
  db: DbOrTx,
  {
    sessionId,
    childRowId,
    state,
    ctx,
    at,
  }: {
    sessionId: string;
    childRowId: string;
    state: ChatEvalState;
    ctx: ChatJudgeContext;
    at: Date;
  },
): Promise<boolean> {
  return db.transaction(async (tx) => {
    await lockSession(tx, sessionId);
    const rows = await readChatRows(tx, sessionId);
    const writes = chatEvalWritesOf({ rows, childRowId, state, ctx });
    if (writes === null) return false;
    for (const write of writes)
      await tx
        .update(talkTurns)
        .set({ chatJudge: write.judge })
        .where(
          and(eq(talkTurns.id, write.id), eq(talkTurns.sessionId, sessionId)),
        );
    const prior = await readCompare(tx, sessionId);
    if (prior !== null)
      await upsertCompare(
        tx,
        sessionId,
        chatCompareMarkOf({
          rows: withWrites(rows, writes),
          met: prior.summary.met,
          homophones: ctx.homophones,
        }),
        at,
      );
    return true;
  });
}

/**
 * 수업별 비교 표지 행을 쓴다(닫는 세 길 — 정리 끝 · 중단 · 30분 닫힘 — 이 남은 평가를 부른 뒤, 묶음 S2). 세션 행 잠금 아래에서 지금 저장된 chat_judge 로
 * 센다. met 은 그 수업의 만남 낱말이다.
 */
export async function writeChatCompare(
  db: DbOrTx,
  {
    sessionId,
    met,
    homophones,
    at,
  }: {
    sessionId: string;
    met: readonly string[];
    homophones: readonly (readonly string[])[];
    at: Date;
  },
): Promise<ChatCompareMark> {
  return db.transaction(async (tx) => {
    await lockSession(tx, sessionId);
    const rows = await readChatRows(tx, sessionId);
    const mark = chatCompareMarkOf({ rows, met, homophones });
    await upsertCompare(tx, sessionId, mark, at);
    return mark;
  });
}

/** 평가 호출 하나의 요청(부르는 쪽이 수업 상태에서 채운다). 아이 이름 칸은 없다. */
export type ChatEvalRequest = {
  profileId: string | null;
  sessionId: string;
  level: number;
  /** 그 단계의 문장 낱말 상한(runAiCall 의 단계 맥락 — 평가 호출은 출력 검사 칸이 없어 쓰이지 않는다). */
  sentenceMaxWords: number;
  /** talk.chat_eval_context_turns. */
  contextTurns: number;
  ctx: ChatJudgeContext;
};

export type ChatEvalResult = {
  /** AI 를 불렀다(기다림인 아이 행이 있었다). */
  called: boolean;
  /** chat_judge 를 썼다(부른 뒤 다른 요청이 먼저 썼으면 거짓). */
  written: boolean;
  /** 판정 없음이면 그 까닭. */
  failure: ChatEvalFailure | null;
};

const NOT_CALLED: ChatEvalResult = {
  called: false,
  written: false,
  failure: null,
};

/**
 * 아이 행 하나의 평가 호출과 저장(응답 뒤 작업 · 닫는 길에서 부른다 — 던지지 않는다). 그 행이 아직 기다림일 때만 부르고(runAiCall — 목적
 * talk_chat_eval, ai.timeout_seconds.feedback · 그 목적의 ai.* 키 · 하루 안전 상한 · 시도 기록), 결과(있음 · 판정 없음)를 writeChatEval 로 쓴다.
 * 실패 · 시간 넘음 · 검증 실패는 판정 없음이고 다시 부르지 않는다. DB · 호출 쪽 예외는 이름만 남기고 판정 없음 · 쓰지 않음으로 끝낸다.
 */
export async function runChatEval(
  req: ChatEvalRequest & { childRowId: string },
  deps: AiDeps = {},
): Promise<ChatEvalResult> {
  const db = deps.db ?? getDb();
  const clock = deps.clock ?? now;
  let input: TalkChatEvalInput | null;
  try {
    const rows = await readChatRows(db, req.sessionId);
    const target = rows.find((row) => row.id === req.childRowId);
    if (target === undefined || !chatEvalPendingOf(target)) return NOT_CALLED;
    // 원문이 지워진 수업은 써도 남기지 않으므로 부르지 않는다
    if (chatLessonSayLostOf(rows)) return NOT_CALLED;
    input = chatEvalInputFor({
      rows,
      childRowId: req.childRowId,
      contextTurns: req.contextTurns,
      unitWords: req.ctx.unitWords,
    });
  } catch (error) {
    console.error(`이야기 방식 평가 행 읽기 실패(${dbErrorTag(error)})`);
    return NOT_CALLED;
  }
  if (input === null) return NOT_CALLED;
  let outcome: AiOutcome<TalkChatEvalOutput>;
  try {
    outcome = await runAiCall(
      levelCallSpecOf(talkChatEvalSpec),
      levelInputOf(input, req),
      { profileId: req.profileId, sessionId: req.sessionId, level: req.level },
      { ...deps, db, clock },
    );
  } catch (error) {
    console.error(`이야기 방식 평가 호출 실패(${dbErrorTag(error)})`);
    outcome = { ok: false, reason: "server", refusals: 0 };
  }
  const failure = outcome.ok ? null : chatEvalFailureOf(outcome.reason);
  // 판정 없음은 그 까닭을 아이 행의 기존 꼴 기록에 함께 남긴다(컨트롤러 결정 (A) — 비교 도구가 까닭별로 셈)
  const state: ChatEvalState = outcome.ok
    ? { status: "done", output: outcome.value }
    : { status: "failed", failure: failure ?? "other" };
  try {
    const written = await writeChatEval(db, {
      sessionId: req.sessionId,
      childRowId: req.childRowId,
      state,
      ctx: req.ctx,
      at: clock(),
    });
    return { called: true, written, failure };
  } catch (error) {
    console.error(`이야기 방식 평가 저장 실패(${dbErrorTag(error)})`);
    return { called: true, written: false, failure };
  }
}

/**
 * 선생님 차례 n+1 이 저장된 뒤의 평가(응답 뒤 작업 — 묶음 S1 이 after 로 부른다): 대화 토막의 마지막 행이 선생님 행이고 바로 앞이 말 입력 아이 행이면
 * (P3 chatEvalAfterTeacherOf) 그 행을 평가한다. 아니면 부르지 않는다.
 */
export async function runChatEvalAfterTurn(
  req: ChatEvalRequest,
  deps: AiDeps = {},
): Promise<ChatEvalResult> {
  const db = deps.db ?? getDb();
  let childRowId: string | null;
  try {
    const rows = chatDialogRowsOf(await readChatRows(db, req.sessionId));
    childRowId = chatEvalAfterTeacherOf(rows)?.id ?? null;
  } catch (error) {
    console.error(`이야기 방식 평가 행 읽기 실패(${dbErrorTag(error)})`);
    return NOT_CALLED;
  }
  if (childRowId === null) return NOT_CALLED;
  return runChatEval({ ...req, childRowId }, { ...deps, db });
}

/**
 * 닫을 때 남은 평가를 동시에 돌리는 수(기술 값 — 설계 숫자가 아니다). 한꺼번에 띄우면 기다림 행 수만큼 AI 호출과 거래가 동시에 서고, 거래들이 세션
 * 잠금을 기다리며 인스턴스의 연결(POOL_MAX)을 쥔다(검토 rev-chat-s0 M-7).
 */
export const CHAT_CLOSE_EVAL_CONCURRENCY = 2;

/** items 를 동시에 limit 개까지만 fn 으로 돌리고, 결과를 넣은 차례로 낸다(fn 은 던지지 않는 것을 넘긴다). */
export async function chatEachLimited<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1)
    throw new RangeError(`동시 수는 1 이상 정수여야 한다: ${limit}`);
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const at = next;
      next += 1;
      out[at] = await fn(items[at] as T);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return out;
}

/**
 * 수업이 닫힐 때(정리 끝 · 중단 · 30분 닫힘 — 묶음 S2 가 after 로 부른다): 아직 기다리는 아이 행 전부를 평가하고(마지막 아이 차례는 n+1 없이 —
 * P3 chatEvalOnCloseOf — 동시에 CHAT_CLOSE_EVAL_CONCURRENCY 개까지), 모두 오거나 판정 없음으로 끝난 뒤 비교 표지 행을 쓴다. 끊겨 기다림으로 남은 행은 비교 기록의 기다림 수로 센다.
 */
export async function runChatEvalsOnClose(
  req: ChatEvalRequest & { met: readonly string[] },
  deps: AiDeps = {},
): Promise<{ evals: ChatEvalResult[]; compare: ChatCompareMark | null }> {
  const db = deps.db ?? getDb();
  const clock = deps.clock ?? now;
  let waiting: ChatTurnRowLike[];
  try {
    const rows = chatDialogRowsOf(await readChatRows(db, req.sessionId));
    waiting = chatEvalOnCloseOf(rows, chatEvalPendingOf);
  } catch (error) {
    console.error(`이야기 방식 평가 행 읽기 실패(${dbErrorTag(error)})`);
    return { evals: [], compare: null };
  }
  const evals = await chatEachLimited(
    waiting,
    CHAT_CLOSE_EVAL_CONCURRENCY,
    (row) =>
      runChatEval({ ...req, childRowId: row.id }, { ...deps, db, clock }),
  );
  try {
    const compare = await writeChatCompare(db, {
      sessionId: req.sessionId,
      met: req.met,
      homophones: req.ctx.homophones,
      at: clock(),
    });
    return { evals, compare };
  } catch (error) {
    console.error(`이야기 방식 비교 기록 실패(${dbErrorTag(error)})`);
    return { evals, compare: null };
  }
}

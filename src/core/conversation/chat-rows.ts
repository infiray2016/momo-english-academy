// 회화 이야기 방식(talk.lead_mode 'chat', intent 2026-11-13-회화-대화-구조-R spec 설계 7 · 8 · 데이터 절)의 수업 행 읽기 · 힌트 호출 입력 · 평가 입력 ·
// 판정 행 · 평가 쓰기 계산. 서버 chat-hint.ts · chat-eval.ts 에 있던 DB 없는 순수 함수를 그대로 옮겼다(13절 C243 보완 10 (1) — 서버 힌트 · 평가 저장과
// 대본 도구 talk-observe 가 같은 함수를 부른다, 옮기기 전 판으로 만든 기준 파일 tests/fixtures/chat-core-move-baseline 과 글자까지 같음). 바뀐 것은
// chatEvalFailureOf 의 입력 형(서버 AiFailureReason → 글)뿐이다. 서버 두 파일은 같은 이름으로 다시 내보낸다.
import type { CallSpec, LevelContext } from "@/core/ai/calls/common";
import {
  type ChatEvalEntry,
  type TalkChatEvalInput,
  talkChatEvalInputOf,
} from "@/core/ai/calls/talk-chat-eval";
import type {
  ChatHintChildInput,
  ChatHintContextEntry,
  ChatHintTierKind,
  TalkChatHintInput,
} from "@/core/ai/calls/talk-chat-hint";
import { chatHintRecordOfRow } from "@/core/conversation/chat-hints";
import {
  type ChatEvalFailure,
  type ChatEvalState,
  type ChatJudge,
  type ChatJudgeChildRow,
  type ChatJudgeContext,
  type ChatJudgeInputKind,
  type ChatJudgeRow,
  chatJudgeChangesOf,
  readChatJudge,
} from "@/core/conversation/chat-judge";
import { chatInputLineOf } from "@/core/conversation/chat-message";
import { chatEvalDueOf } from "@/core/conversation/chat-turn-core";
import {
  type KoHelpDeviceEntry,
  type KoHelpStanding,
  type KoHelpStandingRow,
  koHelpStandingOf,
} from "@/core/conversation/ko-help";
import { leadConversationOrder } from "@/core/conversation/lead-turn-core";
import { readTalkMove } from "@/core/conversation/move";
import { TALK_LOW_BAND } from "@/core/seed/structure";

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

// ── 단계 맥락 칸(runAiCall 의 입력 꼴) ───────────────────────────────────

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

/**
 * AI 호출 실패 갈래(서버 AiFailureReason 의 값 · 대본 도구의 실패 갈래 이름) → 판정 없음의 까닭. 읽지 못함 · 출력 막힘은 검증 실패다(core 는 서버 형을
 * 가져오지 않아 글로 받는다 — 값의 판단은 옮기기 전 그대로).
 */
export function chatEvalFailureOf(reason: string): ChatEvalFailure {
  if (reason === "timeout") return "timeout";
  if (reason === "invalid" || reason === "output_blocked") return "invalid";
  return "other";
}

// ── 판정 행 · 저장 계산(P4 chatJudgeChangesOf) ───────────────────────────────

// ── 한국어 도움(수업 안 한국어로 묻기 묶음 K — 이야기 방식 spec 설계 12 · FR-13) ─────────────────

/**
 * 회화 턴 요청의 기기 값(들려줬는가)을 같은 턴 번호 · 순번의 행 값 위에 얹은 행(서버가 기기 값을 적은 뒤 다시 읽지 않고 판정에 넘기는 값 — 적는
 * 규칙은 state writeKoHelpDevice 와 같다: heard 가 없는 항목은 행 값 그대로). 기기 값이 없으면 같은 행들이다.
 */
export function koHelpRowsWithDeviceOf<R extends KoHelpStandingRow>(
  rows: readonly R[],
  device: readonly KoHelpDeviceEntry[],
): R[] {
  return rows.map((row) => {
    const entry = device.find(
      (d) => d.turnNo === row.turnNo && d.seq === row.seq,
    );
    return entry?.heard === undefined ? row : { ...row, heard: entry.heard };
  });
}

/**
 * 그 아이 차례(턴 번호)에 붙은 도움 행의 대접(ko-help koHelpStandingOf — 묶음 4-다 의 순수 함수 그대로, 단계 구간은 판정 맥락의 band). 그 턴의
 * 행이 없으면 null. 되묻는 차례를 건너 이어받지 않는다(묶음 K, 컨트롤러가 정한 것).
 */
export function chatTurnKoStandingOf(
  koHelps: readonly KoHelpStandingRow[],
  turnNo: number,
  spec: ChatJudgeContext["spec"],
): KoHelpStanding | null {
  const rows = koHelps.filter((h) => h.turnNo === turnNo);
  if (rows.length === 0) return null;
  return koHelpStandingOf(rows, { lowBand: spec.band === TALK_LOW_BAND });
}

/**
 * 대접 → 판정 행의 한국어 도움 칸(chat-judge ChatJudgeChildRow 의 koHelp · koShownWords). 도움으로 대접한 때(koHelp 참)만 koHelp 를 싣고(가르친
 * 표현 목록 · 뜻만이면 null · 힌트 종류), 새로 보인 낱말이 있으면 '말했다' 거름 재료를 싣는다(대접과 관계없이 — 낱말 단위 거름). 도움이 없으면
 * koHelp null 하나뿐이다(한국어로 묻지 않은 턴의 행은 고치기 전 그대로).
 */
export function chatKoJudgeOf(
  standing: KoHelpStanding | null,
): Pick<ChatJudgeChildRow, "koHelp" | "koShownWords"> {
  const koHelp: ChatJudgeChildRow["koHelp"] =
    standing === null || !standing.koHelp || standing.hintKind === "none"
      ? null
      : {
          taught: standing.taught.length > 0 ? [...standing.taught] : null,
          hintKind: standing.hintKind,
        };
  return standing !== null && standing.shownWords.length > 0
    ? { koHelp, koShownWords: [...standing.shownWords] }
    : { koHelp };
}

/** 아이 행의 입력 갈래(판정 꼴). */
function judgeInputOf(row: ChatTurnRowLike): ChatJudgeInputKind {
  return chatChildInputOf(row).kind;
}

/**
 * 판정 함수에 넘기는 행: 대화 토막의 행만, 평가 입력과 같은 차례로(정리 · 짧은 준비 토막 행을 섞지 않음 — rows[at+1] 이 평가의 n+1 과 같은 행).
 * 선생님 행은 나간 say 전체 · 따라 할 문장(move.chat.listen 이 say 에 든 때만) · 막힌 뒤 설명을 보였는지 · 마무리 자리 · 대화 첫 선생님 행, 아이 행은
 * 입력 갈래 · 들린 글 · 바로 앞 선생님 행의 힌트 단 가운데 연 단(hint_level 만큼)의 종류 · 그 차례 앞의 한국어 도움 · 평가 상태다.
 * override 는 저장 전의 새 평가 값(그 아이 행의 상태를 바꿔 센다). ids 는 판정 행 번호 → talk_turns id, stored 는 아이 행 번호 → 저장된 chat_judge 다.
 * koHelps 는 그 세션의 한국어 도움 행(talk_ko_helps — 기기 값을 적은 뒤의 값)이고, 아이 행마다 같은 턴 번호에 붙은 행만 대접(koHelpStandingOf)으로
 * 읽는다(되묻는 차례 뒤 이어받기는 이야기 방식에 걸지 않는다, 묶음 K). 없거나 그 턴의 행이 없으면 도움 없음(null)이라 고치기 전 그대로다.
 */
export function chatJudgeRowsOf(
  rows: readonly ChatTurnRowLike[],
  spec: ChatJudgeContext["spec"],
  override?: { id: string; state: ChatEvalState },
  koHelps: readonly KoHelpStandingRow[] = [],
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
      ...chatKoJudgeOf(chatTurnKoStandingOf(koHelps, row.turnNo, spec)),
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
  koHelps = [],
}: {
  rows: readonly ChatTurnRowLike[];
  childRowId: string;
  state: ChatEvalState;
  ctx: ChatJudgeContext;
  /** 그 세션의 한국어 도움 행(chatJudgeRowsOf 의 koHelps — 없으면 도움 없음). */
  koHelps?: readonly KoHelpStandingRow[];
}): { id: string; judge: ChatJudge }[] | null {
  const target = rows.find(
    (row) => row.id === childRowId && row.speaker === "child",
  );
  if (target === undefined || !chatEvalPendingOf(target)) return null;
  // 원문이 지워진 수업은 다시 셀 재료가 없어 저장된 판정을 고쳐 쓰지 않는다(가장 보수적인 쪽)
  if (chatLessonSayLostOf(rows)) return null;
  const judged = chatJudgeRowsOf(
    rows,
    ctx.spec,
    { id: childRowId, state },
    koHelps,
  );
  if (!judged.ids.includes(childRowId)) return null;
  return chatJudgeChangesOf({
    rows: judged.rows,
    stored: judged.stored,
    ctx,
  }).map(({ row, judge }) => ({ id: judged.ids[row] ?? "", judge }));
}

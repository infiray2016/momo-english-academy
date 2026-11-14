// 회화 이야기 방식(talk.lead_mode 'chat', intent 2026-11-13-회화-대화-구조-R plan 묶음 S1)의 턴 하나 판단. 서버 턴 길(src/server/conversation/chat-turn.ts)과
// 대본 도구(묶음 T1 의 모의 실행기)가 같은 함수를 부르게(NFR-4 · AC-18), 무엇을 부르고 무엇을 저장할지를 DB 없이 정한다: 이번 차례의 입력(아이 행 ·
// 입구), 입구를 받을지, 대화 기록, 사실 줄과 차례 갈래(묶음 P3), 흘리는 동안 문장을 잡아 둘지(묶음 P2 의 판정), 끝의 말풍선 글과 남은 문장, 받침
// 단계 · 잇달아 말한 수 · 끝 줄 신호, 선생님 행 move · 아이 행 칸, 저장된 선생님 행을 다시 흘릴 줄과 그 끝 줄 신호, 수업 시작의 만남 수.
// 순수 모듈이다(DB · 서버 · SDK · 현재 시각 없음). 설정값은 인자로 받는다.
import type { TalkChatHistoryEntry } from "@/core/ai/calls/talk-chat";
import { isLowBandLevel, type TalkHintKind } from "@/core/ai/calls/talk-lesson";
import {
  type ChatClock,
  type ChatFact,
  type ChatInput,
  type ChatRecognizer,
  type ChatRecognizerRules,
  chatInputLineOf,
  chatRecognizerNoteOf,
} from "@/core/conversation/chat-message";
import {
  type ChatReply,
  chatListenLiteralOf,
  chatTeacherMoveOf,
  chatWrapUpHeldAtOf,
} from "@/core/conversation/chat-reply";
import {
  type ChatEndSignal,
  type ChatRowLike,
  type ChatTurnEnd,
  chatAppStuckOf,
  chatClosingTurnOf,
  chatEndSignalOf,
  chatFactsOf,
  chatGreetingEndOf,
  chatLastTurnOf,
  chatQuietAcceptsOf,
  chatSupportStageOf,
  chatTeacherRunOf,
  chatTurnEndOf,
  isChatQuietRow,
} from "@/core/conversation/chat-turn-core";
import { lowBandPlacedLinesOf } from "@/core/conversation/lead-low-band";
import {
  leadConversationOrder,
  leadOpenAcceptsOf,
} from "@/core/conversation/lead-turn-core";
import {
  type LessonArgs,
  lessonTurnSegmentOf,
  type TalkLessonPosition,
  talkLessonPositionOf,
} from "@/core/conversation/lesson-flow";
import type {
  TalkChatSettings,
  TalkLessonChildTurn,
  TalkLessonSettings,
} from "@/core/conversation/lesson-turns";
import { readTalkMove, type TalkMove } from "@/core/conversation/move";
import { isQuestionSentence } from "@/core/conversation/stream";

// ── 입구(spec 설계 3 · 5 · 6 · 10, 보완 4 (5)) ─────────────────────────────

/**
 * 아이 말 없이 부르는 입구 넷: start 수업 첫 말 · more '더 이야기하기' · quiet 누르지 않고 기다림이 지남(조용함) · back 짧은 준비 뒤 돌아옴.
 * quiet 는 아이 행(입력 방식 quiet · 글 없음)을 남기고, 나머지 셋은 아이 행이 없어 사용자 메시지를 선생님 행에 둔다.
 */
export const CHAT_OPENS = ["start", "more", "quiet", "back"] as const;
export type ChatOpen = (typeof CHAT_OPENS)[number];

/** 이야기 방식 대화 호출이 도는 토막(짧은 준비 · 정리는 지금 길). */
const CHAT_TURN_SEGMENTS: ReadonlySet<string> = new Set([
  "greeting",
  "talk",
  "more_talk",
]);

/** 이 토막이 이야기 방식 대화 호출의 토막인가(인사 · 대화 · 더 이야기하기). */
export function chatTurnSegmentOf(segment: string): boolean {
  return CHAT_TURN_SEGMENTS.has(segment);
}

/** 입구 차례의 입력(start 는 수업 시작의 요일 · 때 · 만남 수를 싣는다). */
export function chatOpenInputOf(
  open: ChatOpen,
  start: { clock: ChatClock; met: number } | null,
): ChatInput {
  if (open === "start") {
    if (start === null)
      throw new Error("수업 첫 말 입구에는 시각 · 만남 수가 있어야 한다");
    return { kind: "start", clock: start.clock, met: start.met };
  }
  return { kind: open };
}

/**
 * 입구를 받는가(겹친 요청 막기 표지 행은 부르는 쪽이 따로 본다). 토막이 인사 · 대화 · 더 이야기하기이고 수업이 닫히지 않았을 때만이다.
 * - start: 인사 토막이고 행이 하나도 없음(카드 인사 첫 줄을 넣지 않고 연 수업 — spec 설계 5).
 * - back: 대화 토막에서 짧은 준비가 열린 뒤 대화 첫 질문 차례(위치 되짚기 firstQuestionDue · prepOpened).
 * - more: 지금 새 방식의 입구 more 와 같은 조건(leadOpenAcceptsOf — 고를 차례가 남음).
 * - quiet: 마지막 행이 선생님 행이고(앞 quiet 가 끊겨 고아로 남았으면 그 행을 다시 씀) 대화 첫 질문 · 짧은 준비를 기다리지 않으며, 고를 차례가
 *   아니고 잇달아 말한 수가 상한 아래이며 talk.chat_quiet_seconds 가 0 이 아닐 때(chatQuietAcceptsOf — 화면 신호와 이중으로 지킴).
 * rows 는 고아 행을 뺀 살아 있는 행(거르지 않음), orphan 은 선생님 말이 없는 끝의 아이 행이다.
 */
export function chatOpenAcceptsOf(
  open: ChatOpen,
  {
    segment,
    position,
    rows,
    orphan,
    settings,
  }: {
    segment: string;
    position: Pick<
      TalkLessonPosition,
      | "closed"
      | "lastRow"
      | "choice"
      | "firstQuestionDue"
      | "prepOpened"
      | "prepPending"
    >;
    rows: readonly ChatRowLike[];
    orphan: ChatRowLike | null;
    settings: Pick<TalkChatSettings, "quietSeconds" | "teacherRunMax">;
  },
): boolean {
  if (!chatTurnSegmentOf(segment) || position.closed) return false;
  if (open === "start")
    return segment === "greeting" && rows.length === 0 && orphan === null;
  if (orphan !== null && !(open === "quiet" && isChatQuietRow(orphan)))
    return false;
  if (rows.at(-1)?.speaker !== "tori" || position.lastRow !== "teacher")
    return false;
  if (open === "back")
    return (
      segment === "talk" &&
      position.firstQuestionDue &&
      position.prepOpened &&
      position.choice === null
    );
  if (open === "more")
    return leadOpenAcceptsOf("more", {
      segment,
      firstQuestionDue: position.firstQuestionDue,
      choice: position.choice,
    });
  if (chatFirstQuestionBlocksOf(position) || position.prepPending) return false;
  return chatQuietAcceptsOf({ rows, choice: position.choice, settings });
}

/**
 * 이야기 방식 수업에서 대화 첫 질문 차례(firstQuestionDue)가 아이 차례를 막는가: 짧은 준비가 열렸거나 대화 중 준비가 남았을 때만이다 — 그때는
 * 돌아옴 입구(back)가 대화 첫 선생님 행(first_question)을 써야 아이 차례가 열린다. 준비가 열리지 않은 수업은 인사에서 대화로 넘어갈 때 호출 사이에
 * 아무것도 끼우지 않으므로(spec 설계 5) 대화 첫 질문 행이 없어 이 값이 늘 참으로 남는다 — 그 값으로 아이 차례를 막지 않는다.
 */
export function chatFirstQuestionBlocksOf(
  position: Pick<
    TalkLessonPosition,
    "firstQuestionDue" | "prepOpened" | "prepPending"
  >,
): boolean {
  return (
    position.firstQuestionDue && (position.prepOpened || position.prepPending)
  );
}

/**
 * 수업 시작 입력 줄의 머리(요일 · 때 · 만남 수 앞 — P1 chatInputLineOf 의 글에서 얻는다, 검토 rev-chat-s1 M-3). 다시 흘림 판단이 그 글을 다시 적지 않게 한다.
 */
const CHAT_START_LINE_HEAD = (
  chatInputLineOf({
    kind: "start",
    clock: { weekday: "Sunday", dayPart: "morning" },
    met: 0,
  }).split(" It is ")[0] ?? ""
).trim();

/**
 * 입구를 다시 보냈을 때(연결이 끊겨 다시 부름) 다시 흘릴 마지막 선생님 행인가: 그 입구가 쓴 이야기 방식 행(move.chat 과 행에 둔 사용자 메시지가
 * 있음)이고 그 메시지의 입력 줄이 그 입구의 줄(P1 chatInputLineOf 의 글)이다. 그 입구를 지금 새로 받을 수 있으면(acceptsNew — chatOpenAcceptsOf)
 * 다시 흘리지 않는다: '더 이야기하기' 입구 차례가 마무리 제안으로 끝나면 다음 '더 이야기하기'는 새 차례여야 한다(같은 말 · 두 단추가 되풀이되지 않게 —
 * 검토 rev-chat-s1 I-1). quiet 는 아이 행이 남아 아이 차례 길의 다시 보냄 규칙(고아 행 다시 씀)을 따르므로 거짓이다.
 */
export function chatOpenReplayOf(
  open: ChatOpen,
  last:
    | { speaker: string; move?: unknown; sentUserMessage?: string | null }
    | undefined,
  acceptsNew: boolean,
): boolean {
  if (acceptsNew) return false;
  if (open === "quiet" || last?.speaker !== "tori" || !last.sentUserMessage)
    return false;
  if (!readTalkMove(last.move)?.chat) return false;
  const line = last.sentUserMessage.split("\n").at(-1) ?? "";
  if (open === "start") return line.startsWith(CHAT_START_LINE_HEAD);
  return line === chatInputLineOf({ kind: open });
}

// ── 아이 행 → 입력(spec 설계 3 · 11) ────────────────────────────────────

/** 들린 글 · 다른 후보의 다듬기: 줄바꿈을 빈칸 하나로 접는다(앱의 사실 줄처럼 보이는 줄이 생기지 않게 — 검토 rev-chat-p1 H4). */
export function foldChatLine(text: string): string {
  return text.replace(/\s*[\r\n]+\s*/g, " ").trim();
}

/** 아이 행의 칸(talk_turns 행과 구조가 맞는 최소 꼴). */
export type ChatChildRowLike = {
  inputMode: string | null;
  text: string | null;
  clientListen: unknown;
};

const nospeechOf = (clientListen: unknown): boolean =>
  (clientListen as { src?: unknown } | null | undefined)?.src === "nospeech";

/**
 * 저장된 아이 행 → 대화 호출의 입력: quiet 행은 조용함, '잘 모르겠어요' 행 가운데 말소리 없음(client_listen 출처 nospeech)은 눌렀으나 듣지 못함, 그 밖은
 * '잘 모르겠어요', 말 행은 들린 글(줄바꿈을 접은 글 — 가림은 호출 규격이 한다)이다. 들린 글이 비면 눌렀으나 듣지 못함이다(빈 말 줄을 보내지 않음, P1).
 * 인식기 정보는 다른 후보를 같은 다듬기로 접은 뒤 알림 판단(chatRecognizerNoteOf)에 넘긴다(다른 후보의 이름 가림도 호출 규격이 한다).
 */
export function chatTurnInputOf(
  child: ChatChildRowLike,
  recognizer: ChatRecognizer | undefined,
  rules: ChatRecognizerRules,
): ChatInput {
  if (child.inputMode === "quiet") return { kind: "quiet" };
  if (child.inputMode === "dont_know")
    return nospeechOf(child.clientListen)
      ? { kind: "not_heard" }
      : { kind: "dont_know" };
  const heard = foldChatLine(child.text ?? "");
  if (heard === "") return { kind: "not_heard" };
  const folded =
    recognizer === undefined
      ? undefined
      : {
          ...recognizer,
          ...(recognizer.alternative === undefined
            ? {}
            : { alternative: foldChatLine(recognizer.alternative) }),
        };
  const note = chatRecognizerNoteOf(folded, heard, rules);
  return note === null
    ? { kind: "speech", heard }
    : { kind: "speech", heard, note };
}

/**
 * 이번 아이 행의 흐름 꼴(저장된 행을 lessonTurnOf 가 읽을 값과 같게): 입력 방식 · 말소리 없음은 행의 값, 막힘은 앱이 아는 막힘(chatAppStuckOf —
 * 서버는 그 값으로 stuck_phrase 를 채운다), 토막은 지금 규칙(lessonTurnSegmentOf), 노린 단어는 지금 질문 자리의 것. quiet 행은 흐름 행이 아니라 null.
 */
export function chatChildLiteOf(
  position: Pick<
    TalkLessonPosition,
    "segment" | "phase" | "lastGreetingQuestion" | "stuckInSlot" | "slot"
  >,
  child: Pick<ChatChildRowLike, "inputMode" | "clientListen">,
  stuck: boolean,
  settings: Pick<TalkLessonSettings, "dontknowMax">,
): TalkLessonChildTurn | null {
  if (child.inputMode === "quiet") return null;
  const mode = child.inputMode === "dont_know" ? "dont_know" : "speech";
  const nospeech = mode === "dont_know" && nospeechOf(child.clientListen);
  const cause = mode === "speech" ? "speech" : nospeech ? "nospeech" : "button";
  return {
    speaker: "child",
    segment: lessonTurnSegmentOf(position, cause, settings),
    input: mode,
    stuck: mode === "speech" && stuck,
    nospeech,
    targets: [...(position.slot?.words ?? [])],
  };
}

// ── 대화 기록(spec 설계 2 '대화 기록') ───────────────────────────────────

/** 대화 기록 · 받침 단계 · 잇달아 말한 수가 읽는 행의 칸(서버 행 · 대본 도구의 행이 같은 꼴). */
export type ChatTurnRowLike = ChatRowLike & {
  turnNo: number;
  segment: string;
  text: string | null;
  move?: unknown;
  toriRewrite?: string | null;
  sentUserMessage?: string | null;
};

/**
 * 앞 차례들: 이야기 방식 선생님 행(move.chat · 기록 글이 있음)마다 { 그 차례에 보낸 사용자 메시지 그대로, 그 행의 기록 글 그대로 }. 입구로 연 차례는
 * 메시지가 선생님 행에 있고, 아이 차례(quiet 포함)는 바로 앞 아이 행에 있다. 기록 글이 없는 행(실패 차례의 카드 대사)은 넣지 않는다. 글은 다시
 * 직렬화하지 않는다(프롬프트 캐시의 앞머리 — 검토 rev-chat-s0 4절 S1-2).
 */
export function chatHistoryOf(
  rows: readonly ChatTurnRowLike[],
): TalkChatHistoryEntry[] {
  const ordered = leadConversationOrder(
    rows.filter((row) => chatTurnSegmentOf(row.segment)),
  );
  const out: TalkChatHistoryEntry[] = [];
  ordered.forEach((row, i) => {
    if (row.speaker !== "tori") return;
    if (!readTalkMove(row.move)?.chat || !row.toriRewrite) return;
    if (row.sentUserMessage) {
      out.push({ user: row.sentUserMessage, assistant: row.toriRewrite });
      return;
    }
    const prev = ordered[i - 1];
    if (prev?.speaker !== "child" || !prev.sentUserMessage) return;
    out.push({ user: prev.sentUserMessage, assistant: row.toriRewrite });
  });
  return out;
}

/** 거르지 않은 행에서 마지막 선생님 행의 받침 단계(move.stage — 없으면 0). quiet 차례가 앞 받침을 잇는 데 쓴다(P3 fix 1). */
export function chatPrevStageOf(
  rows: readonly Pick<ChatTurnRowLike, "speaker" | "move">[],
): number {
  const last = rows.findLast((row) => row.speaker === "tori");
  return readTalkMove(last?.move)?.stage ?? 0;
}

// ── 부르기 전 판단(spec 설계 3 · 5 · 9 · 10) ──────────────────────────────

export type ChatTurnPlan = {
  input: ChatInput;
  /** 이번 아이 행의 흐름 꼴(입구 · quiet 는 null). */
  lite: TalkLessonChildTurn | null;
  /** 거른 흐름 행 + 이번 아이 행의 위치(입구 · quiet 는 지금 위치). 참여 완료 · 받침 단계 · 끝 줄의 자리 막힘 수가 읽는다. */
  positionAfter: TalkLessonPosition;
  facts: ChatFact[];
  /** 이 아이 차례로 대화 안전 상한에 닿음(말 뒤 앱이 닫음). */
  lastTurn: boolean;
  /** 앱의 마무리 차례(참고 턴 · 한 바퀴 끝). */
  closing: boolean;
  /** 이 아이 차례로 인사가 끝남. */
  greetingEnd: boolean;
  /** 이 차례 뒤 짧은 준비가 열림(인사 끝 사실 줄을 붙인 차례 — 끝 줄 신호를 비움). */
  prepNext: boolean;
  /** 이번 입력이 앱이 아는 막힘(막힌 뒤 고르기 물음 빼기 · 설명 기다림). */
  appStuck: boolean;
  /** 응답의 wrap_up 참을 거짓으로 다룰 자리(수업 첫 말 · 인사 토막 · 돌아옴). */
  wrapUpHeldAt: ReturnType<typeof chatWrapUpHeldAtOf>;
  /** 대화 첫 선생님 행(first_question)으로 적는가 — 돌아옴 차례(위치 되짚기의 대화 첫 질문 차례를 닫는다). */
  firstQuestion: boolean;
};

/**
 * 부르기 전의 판단: 이번 아이 행의 흐름 꼴과 그 뒤 위치, 사실 줄 · 안전 상한 · 마무리 차례 · 인사 끝 · 짧은 준비 앞 차례 · wrap_up 을 거짓으로 다룰
 * 자리. args · position 은 quiet 행을 거른 흐름(수업 상태), rows 는 거르지 않은 살아 있는 행(이번 아이 행 앞까지 — 안전 상한의 셈). prepOpens 는
 * 인사 뒤 짧은 준비가 열리는 수업인가(처음 스냅숏의 준비 계획이 있음).
 */
export function chatTurnPlanOf({
  input,
  child,
  args,
  position,
  rows,
  segment,
  prepOpens,
  safetyMaxTurns,
  settings,
}: {
  input: ChatInput;
  child: Pick<ChatChildRowLike, "inputMode" | "clientListen"> | null;
  args: LessonArgs;
  position: TalkLessonPosition;
  rows: readonly ChatRowLike[];
  segment: string;
  prepOpens: boolean;
  safetyMaxTurns: number;
  settings: Pick<TalkLessonSettings, "dontknowMax">;
}): ChatTurnPlan {
  const appStuck = chatAppStuckOf(input);
  const lite =
    child === null
      ? null
      : chatChildLiteOf(position, child, appStuck, settings);
  const positionAfter =
    lite === null
      ? position
      : talkLessonPositionOf({ ...args, turns: [...args.turns, lite] });
  const lastTurn = chatLastTurnOf({ rows, input, safetyMaxTurns });
  const greetingEnd = chatGreetingEndOf({ input, position, settings });
  const closing = chatClosingTurnOf({
    input,
    positionAfter: () => positionAfter,
  });
  const facts = chatFactsOf({ greetingEnd, prepOpens, closing, lastTurn });
  return {
    input,
    lite,
    positionAfter,
    facts,
    lastTurn,
    closing,
    greetingEnd,
    prepNext: greetingEnd && prepOpens && !lastTurn,
    appStuck,
    wrapUpHeldAt: chatWrapUpHeldAtOf({
      input: input.kind,
      greeting: segment === "greeting",
    }),
    firstQuestion: input.kind === "back",
  };
}

// ── 흘리는 동안(spec 설계 4 · 보완 4 (12)) ─────────────────────────────────

/**
 * 흘려 받는 문장을 바로 내보낼지 잡아 둘지(묶음 P2 의 판정을 씀): 1~3단계에서 따라 할 문장(6.4 를 지난 글 — onListen 의 마지막 값)을 본체가 글에서 뺄
 * 조각이 든 문장(chatListenLiteralOf)이나, 앞 아이 차례가 앱이 아는 막힘인 차례의 물음 문장(본체가 or 물음을 소리 줄로 뺄 수 있음)부터는 잡아 두고,
 * 한 번 잡으면 뒤 문장도 잡는다(문장 차례를 지킴). holdAll 이면 처음부터 모두 잡는다(안전 상한 차례 — 닫는 줄 하나로 낸다). 잡아 둔 조각을 소리 줄
 * 글로 쓰지 않는다 — 끝의 말풍선 글 · 소리 줄은 본체(chatReplyOf)의 결과 하나다.
 */
export type ChatSentenceFlow = {
  /** 따라 할 문장의 알림(한 턴에 시도마다 올 수 있다 — 마지막 값을 쓴다). */
  listen: (sentence: string) => void;
  /** 문장 하나: 참이면 지금 내보낸다. */
  accept: (sentence: string) => boolean;
  /** 지금까지 내보낸 문장. */
  sent: () => string[];
  /** 잡아 둔 문장. */
  held: () => string[];
};

export function createChatSentenceFlow({
  level,
  appStuck,
  holdAll,
}: {
  level: number;
  appStuck: boolean;
  holdAll: boolean;
}): ChatSentenceFlow {
  const low = isLowBandLevel(level);
  let listen = "";
  let holding = holdAll;
  const sent: string[] = [];
  const held: string[] = [];
  return {
    listen: (sentence) => {
      listen = sentence;
    },
    accept: (sentence) => {
      if (
        !holding &&
        low &&
        ((listen !== "" && chatListenLiteralOf(sentence, listen, level)) ||
          (appStuck && isQuestionSentence(sentence)))
      )
        holding = true;
      if (holding) {
        held.push(sentence);
        return false;
      }
      sent.push(sentence);
      return true;
    },
    sent: () => [...sent],
    held: () => [...held],
  };
}

// ── 응답 뒤 판단(spec 설계 6 · 7 (마) · 9 · 10) ─────────────────────────────

/**
 * 응답 뒤: 차례 끝 갈래 · 받침 단계(앞 선생님 행 move.stage 를 prevStage 로) · 잇달아 말한 수(이번 아이 행까지 넣은 거르지 않은 행 rowsAfter) ·
 * 끝 줄 신호. wrapUp 은 응답 처리(chatReplyOf)를 지난 값이고, aiResting 은 이 차례가 'AI 쉬는 중'으로 끝났는지다.
 */
export function chatTurnFinishOf({
  plan,
  wrapUp,
  prevStage,
  rowsAfter,
  aiResting,
  settings,
}: {
  plan: Pick<
    ChatTurnPlan,
    "input" | "positionAfter" | "closing" | "lastTurn" | "prepNext"
  >;
  wrapUp: boolean;
  prevStage: number;
  rowsAfter: readonly ChatRowLike[];
  aiResting: boolean;
  settings: {
    lesson: Pick<TalkLessonSettings, "dontknowMax">;
    chat: Pick<
      TalkChatSettings,
      "quietSeconds" | "teacherRunMax" | "alternatives" | "explainWaitSeconds"
    >;
  };
}): {
  end: ChatTurnEnd;
  stage: number;
  run: number;
  signal: ChatEndSignal;
} {
  const end = chatTurnEndOf({
    closing: plan.closing,
    lastTurn: plan.lastTurn,
    wrapUp,
  });
  const stage = chatSupportStageOf({
    input: plan.input,
    positionAfter: plan.positionAfter,
    prevStage,
    settings: settings.lesson,
  });
  const run = chatTeacherRunOf(rowsAfter);
  const signal = chatEndSignalOf({
    end,
    run,
    aiResting,
    prepNext: plan.prepNext,
    input: plan.input,
    settings: settings.chat,
  });
  return { end, stage, run, signal };
}

/** 응답이 없던 차례(실패 · 끊김 · 첫 말 대신 카드 인사)의 응답 처리 꼴: 글 · 뜻만, 소리 줄 · 맺음 없음, 수준 검사 수치 없음. */
export function chatFallbackReplyOf(line: {
  en: string;
  ko?: string | undefined;
}): ChatReply {
  return {
    text: line.en,
    sayKo: line.ko ?? "",
    sound: {},
    wrapUp: false,
    record: { level: {}, madeUp: [] },
  };
}

/**
 * 이야기 방식 선생님 행의 move: 응답 처리의 move(chatTeacherMoveOf)에 받침 단계와 chat 묶음(문장 문 걸림 · 붙인 사실 줄 · 조용함으로 연 차례 ·
 * 잇달아 말한 수 · 첫 문장 시간)을 함께 적는다 — 한쪽만 있으면 위치 되짚기가 막힌 횟수를 잇지 못한다(P3 fix 2). 응답이 없던 차례도 같은 꼴이다.
 * text 는 화면에 나간 글(chatReleaseOf 의 shown 을 이은 글)이다.
 */
export function chatTeacherRowMoveOf({
  plan,
  reply,
  text,
  stage,
  run,
  gate,
  firstMs,
}: {
  plan: Pick<ChatTurnPlan, "input" | "facts" | "closing" | "firstQuestion">;
  reply: ChatReply;
  text: string;
  stage: number;
  run: number;
  gate: readonly string[];
  firstMs: number | null;
}): TalkMove {
  return chatTeacherMoveOf({
    reply: { ...reply, text },
    closingSlot: plan.closing,
    firstQuestion: plan.firstQuestion,
    stage,
    extra: {
      facts: plan.facts.map((fact) => fact.kind),
      run,
      ...(gate.length > 0 ? { gate: [...new Set(gate)] } : {}),
      ...(plan.input.kind === "quiet" ? { quiet: true as const } : {}),
      ...(firstMs === null
        ? {}
        : { firstMs: Math.max(0, Math.round(firstMs)) }),
    },
  });
}

/**
 * 아이 행에 고쳐 쓸 칸(spec 설계 8-1 · 데이터 절): 공식 '말했다' 낱말은 늘 빈 목록 · 스스로 쓴 낱말 후보는 비움 · 앱이 아는 막힘 말이면 막힘 말 칸 ·
 * 보낸 사용자 메시지(가린 뒤의 글) · 힌트 종류와 연 단 수(묶음 P5 chatChildHintOf 의 값).
 */
export function chatChildFieldsOf({
  input,
  sentUserMessage,
  hint,
}: {
  input: ChatInput;
  sentUserMessage: string | null;
  hint: { hintKind: TalkHintKind; hintLevel: number };
}): {
  saidWords: string[];
  selfUsedWords: string[];
  stuckPhrase: string | null;
  sentUserMessage: string | null;
  hintKind: TalkHintKind;
  hintLevel: number;
} {
  return {
    saidWords: [],
    selfUsedWords: [],
    stuckPhrase:
      input.kind === "speech" && chatAppStuckOf(input) ? input.heard : null,
    sentUserMessage,
    hintKind: hint.hintKind,
    hintLevel: hint.hintLevel,
  };
}

// ── 다시 흘리기 · 이어 하기의 끝 줄 신호 ─────────────────────────────────────

/** 저장된 선생님 행을 다시 흘릴 줄(실시간 길과 같은 꼴 — 문장마다 글 · 뜻 · 소리 줄). 신호 말 · 마무리 상수는 이 방식에 없다. */
export type ChatReplayLine =
  | { t: "s"; en: string }
  | { t: "ko"; ko: string }
  | { t: "sound"; kind: "model" | "answer"; say: string };

export function chatReplayLinesOf(
  row: { text: string | null; toriKo: string | null; move?: unknown },
  koMeaning: boolean,
): ChatReplayLine[] {
  const move = readTalkMove(row.move);
  const sound = move?.sound;
  const say = {
    ...(sound?.model ? { model: sound.model } : {}),
    ...(sound?.answer ? { answer: sound.answer } : {}),
  };
  // 글 사이에서 읽은 소리 줄은 행에 남긴 자리(move.chat.soundAt)에 끼운다 — 실시간 길(chatTurnResultOf)과 같은 차례(13절 C241 보완 7). 자리가 없는
  // 소리 줄(지난 행 포함)은 지금처럼 뜻 줄 뒤다
  const at = move?.chat?.soundAt ?? {};
  const out: ChatReplayLine[] = [];
  const placed = new Set<"model" | "answer">();
  for (const line of lowBandPlacedLinesOf(row.text ?? "", {
    ...(say.model === undefined || at.model === undefined
      ? {}
      : { model: at.model }),
    ...(say.answer === undefined || at.answer === undefined
      ? {}
      : { answer: at.answer }),
  })) {
    if (line.t === "s") {
      out.push(line);
      continue;
    }
    const text = say[line.kind];
    if (text === undefined) continue;
    placed.add(line.kind);
    out.push({ t: "sound", kind: line.kind, say: text });
  }
  if (koMeaning && row.toriKo) out.push({ t: "ko", ko: row.toriKo });
  for (const kind of ["model", "answer"] as const) {
    const text = say[kind];
    if (text !== undefined && !placed.has(kind))
      out.push({ t: "sound", kind, say: text });
  }
  return out;
}

/** 저장된 행의 아이 입력(설명 기다림 판단용 — 인식기 알림은 쓰지 않음). 앞에 아이 행이 없으면(입구) null. */
const NO_RECOGNIZER: ChatRecognizerRules = {
  unsureConfidence: 0,
  unsureOnPartial: false,
};

/**
 * 저장된 마지막 선생님 행의 끝 줄 신호(같은 시도 다시 흘림 · 이어 하기 자료가 실시간 길과 같은 판단을 쓰게 — 묶음 S2 도 부른다). rows 는 그 수업의 행을
 * 대화 차례로 둔 것(거르지 않음)이고 마지막 행이 그 선생님 행이다. 차례 끝은 그 행의 move(마무리 자리 → closing, 마무리 제안 → suggestion), 짧은 준비
 * 앞 차례는 붙인 사실 줄(prep_next), 설명 기다림은 바로 앞 아이 행의 입력으로 정한다. 안전 상한 차례는 그 뒤 수업이 닫혀 다시 흘리지 않는다.
 */
export function chatSignalOfRows({
  rows,
  aiResting,
  settings,
}: {
  rows: readonly (ChatTurnRowLike & ChatChildRowLike)[];
  aiResting: boolean;
  settings: Pick<
    TalkChatSettings,
    "quietSeconds" | "teacherRunMax" | "alternatives" | "explainWaitSeconds"
  >;
}): ChatEndSignal {
  const ordered = leadConversationOrder(rows);
  const teacher = ordered.at(-1);
  if (teacher?.speaker !== "tori") return {};
  const move = readTalkMove(teacher.move);
  const end: ChatTurnEnd =
    move?.kind === "closing_slot"
      ? "closing"
      : move?.next === "closing"
        ? "suggestion"
        : null;
  const prev = ordered.at(-2);
  const input: ChatInput =
    prev?.speaker === "child"
      ? chatTurnInputOf(prev, undefined, NO_RECOGNIZER)
      : { kind: "more" };
  return chatEndSignalOf({
    end,
    run: chatTeacherRunOf(ordered),
    aiResting,
    prepNext: move?.chat?.facts.includes("prep_next") === true,
    input,
    settings,
  });
}

// ── 수업 시작의 만남 수(spec 설계 3 수업 시작 행) ─────────────────────────────

/**
 * 같은 프로필이 같은 선생님과 한 회화 수업 가운데 정리까지 닫힌 수(방식 무관): 이 수업 밖의 세션 가운데 토막이 정리(wrap_up)이고 처음 스냅숏의 선생님
 * 키가 같은 것. 선생님 키가 없는 옛 세션은 세지 않는다.
 */
export function chatMetCountOf(
  sessions: readonly {
    id: string;
    segment: string | null;
    teacherKey: string | null;
  }[],
  { sessionId, teacherKey }: { sessionId: string; teacherKey: string },
): number {
  const ids = new Set<string>();
  for (const s of sessions)
    if (
      s.id !== sessionId &&
      s.segment === "wrap_up" &&
      s.teacherKey === teacherKey
    )
      ids.add(s.id);
  return ids.size;
}

/** 카드 인사 첫 줄(첫 말 호출이 실패하거나 'AI 쉬는 중'일 때 — spec 설계 5, {NAME} 은 화면이 채움). */
export function chatCardGreetingLineOf(card: {
  greeting:
    | { questions: readonly { question: { en: string; ko: string } }[] }
    | { firstLine: { en: string; ko?: string | undefined } };
}): { en: string; ko?: string } {
  if ("firstLine" in card.greeting) {
    const { en, ko } = card.greeting.firstLine;
    return ko === undefined ? { en } : { en, ko };
  }
  const first = card.greeting.questions[0]?.question;
  if (!first) throw new Error("카드 인사 질문이 없다(시드 결함)");
  return { en: first.en, ko: first.ko };
}

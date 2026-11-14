// 새 회화 엔진(Claude 가 이끄는 대화, talk.lead_mode claude)의 한 차례 판단(spec '회화 Claude 주도' 설계 1 · 2 · 3 · 6 · 8 · 데이터 절, plan 묶음 S1).
// 서버 턴 길(src/server/conversation/lead-turn.ts)과 대본 도구(createTalkSim, 묶음 X2)가 같은 함수를 부른다(NFR-4). 여기서 정하는 것은 갈림 ·
// 사실 알림의 값 · 대화 기록 · 흘려 받는 동안 붙잡을 문장 · 끝에서 낼 글과 소리 줄 · 좁은 정의 다시 말하기의 요청 규격이다. 차례의 종류 ·
// 질문 여부 · 도움 순서 · 카드 전환은 정하지 않고, 응답을 고쳐 쓰지 않는다(예외는 문장 문의 안전 대사와 좁은 정의의 다시 말하기 한 번뿐 —
// FR-2 · FR-7). 지금 길의 함수(talk-lesson · question-retry · 차례 계획)는 부르지 않는다. 순수 모듈이다(시각 · DB · SDK 없음).
import { z } from "zod";
import type { CallSpec, ChatMessage } from "@/core/ai/calls/common";
import {
  type TalkLeadChild,
  type TalkLeadGreetingLine,
  type TalkLeadHelpCounts,
  type TalkLeadHistoryEntry,
  type TalkLeadInput,
  type TalkLeadLevelText,
  type TalkLeadRules,
  type TalkLeadSoundNote,
  type TalkLeadStatus,
  talkLeadGoalWordsSaidOf,
  talkLeadMessages,
  talkLeadSoundNotesOf,
  talkLeadSystem,
  talkLeadTextOf,
  talkLeadTurnSpec,
} from "@/core/ai/calls/talk-lead";
import {
  isLowBandLevel,
  type TalkHeardHelp,
  type TalkHintKind,
} from "@/core/ai/calls/talk-lesson";
import type { OutputCheckOptions } from "@/core/ai/output-check";
import {
  heardHintsOf,
  type SoundAlikeEntry,
} from "@/core/conversation/heard-hint";
import {
  type AiHints,
  koExplanationShownOf,
  type LessonHintSpec,
} from "@/core/conversation/hints";
import {
  type LeadHintBlock,
  leadAiHintsOf,
  leadHintBlockOf,
} from "@/core/conversation/lead-hints";
import type {
  LeadLevelInput,
  LeadNarrowHit,
} from "@/core/conversation/lead-level";
import {
  type LowBandPlacedLine,
  type LowBandSoundAt,
  leadKoLineOf,
  leadLowBandShownOf,
  lowBandPlacedLinesOf,
  lowBandSoundAtOf,
} from "@/core/conversation/lead-low-band";
import {
  isLeadSession,
  type TalkLeadMode,
} from "@/core/conversation/lead-mode";
import {
  isLeadAskAgain,
  type LeadChildHelp,
  type LeadExtra,
  leadAskAgainFloorOf,
  leadSaidWordsOf,
  leadStuckOf,
  leadWrapSourcesOf,
} from "@/core/conversation/lead-record";
import {
  childCauseOf,
  type TalkLessonChildTurn,
} from "@/core/conversation/lesson-turns";
import {
  readTalkMove,
  TALK_LEAD_MOVES,
  TALK_LEAD_READINGS,
  type TalkLead,
  type TalkLeadMove,
  type TalkLeadReading,
  type TalkMove,
} from "@/core/conversation/move";
import { isClosingQuestion } from "@/core/conversation/question-check";
import { isQuestionSentence } from "@/core/conversation/stream";
import { splitSentences } from "@/core/seed/text";

// ── ai_calls 표지(데이터 절 ai_calls 행) ─────────────────────────────

// 상수는 작은 모듈(lead-call-tags)에 두고 여기서 같은 이름으로 다시 내보낸다(store.ts 가 이 모듈 전체를 불러오지 않게 — 검토 rev-s1-2 N-5 (b))
export {
  LEAD_NARROW_RECORD_TAG,
  LEAD_RECORD_TAG,
} from "@/core/conversation/lead-call-tags";

// ── 갈림(spec 설계 1) ───────────────────────────────────────────────

/** 단계 · 단원의 안내문 글을 찾는 함수(기본은 talkLeadTextOf — 시험이 바꾼다). */
export type LeadTextOf = (
  level: number,
  unit: number,
) => TalkLeadLevelText | null;

/** 새 엔진의 턴 길을 쓰는 토막(대화 · 더 이야기하기). 인사 · 짧은 준비 · 정리는 두 방식 모두 지금 길이다. */
const LEAD_SEGMENTS: ReadonlySet<string> = new Set(["talk", "more_talk"]);

/**
 * 수업을 처음 열 때 처음 스냅숏에 적을 방식(13절 C241 보완 · 검토 rev-s1 I-2): 셋이 모두 설 때만 claude 다 — 설정 talk.lead_mode 가 claude ·
 * 단계가 새 방식의 구간(isLeadSession 과 같은 판정, 지금 1~3단계) · 그 단계 · 단원의 안내문 글이 있음(talkLeadTextOf, 지금 회화 3단계 단원 1 만).
 * 하나라도 서지 않으면 app 이라 스냅숏에 칸을 적지 않고, 그 수업은 기존 방식으로 간다(안내문 글이 없는 단원에서 새 방식이 열려 대화 첫머리에서
 * 멈추지 않게). 그 뒤 판단은 스냅숏 값 하나(isLeadSession)로만 한다. leadText 는 안내문 글 출처(기본 talkLeadTextOf — 시험이 1단계 시드로 새
 * 방식을 열게 바꾼다, 턴 길의 LeadTurnDeps.leadText 와 같은 자리).
 */
export function leadStartModeOf({
  mode,
  level,
  unit,
  leadText = talkLeadTextOf,
}: {
  mode: TalkLeadMode;
  level: number;
  unit: number;
  leadText?: LeadTextOf | undefined;
}): TalkLeadMode {
  return isLeadSession({ start: { leadMode: mode }, level }) &&
    leadText(level, unit) !== null
    ? "claude"
    : "app";
}

/**
 * 정리 되짚을 말의 문장 출처(쉬는 중 닫기 · 정리 토막 — plan 확인할 것 9, 검토 rev-s1 I-1): 새 엔진 세션(isLeadSession)은 recast 칸이 비므로 앱이
 * 확인한 따라 할 문장(leadWrapSourcesOf), 그 밖은 선생님 행의 되받은 말(recast — 지금 식 그대로). index.ts lessonWrapSourcesOf 와 같은 판단 · 같은
 * 식이다(단위 시험이 두 함수의 답이 같음을 지킨다).
 */
export function leadWrapRecastsOf(state: {
  start: { readonly leadMode?: unknown } | null | undefined;
  level: number;
  rows: readonly {
    speaker: "child" | "tori";
    recast?: string | null;
    move?: unknown;
  }[];
}): string[] {
  if (isLeadSession(state))
    return leadWrapSourcesOf(state.rows.filter((r) => r.speaker === "tori"));
  return state.rows.flatMap((r) =>
    r.speaker === "tori" && r.recast ? [r.recast] : [],
  );
}

/**
 * 이 차례의 선생님 말을 새 엔진이 만드는가(spec 설계 1 갈림): 세션의 방식 판단은 묶음 S2 가 둔 isLeadSession(처음 스냅숏이 claude 이고 단계가
 * 안내문의 값이 정해진 구간 — S1 · S2 · S3 가 같은 함수로 가른다, 검토 rev-s2 I-3) 하나이고, S1 은 토막(대화 · 더 이야기하기) 조건만 더한다.
 * 지금 설정 값(settings.leadMode)은 새 수업의 스냅숏을 쓸 때만 쓰는 값이라 여기서 읽지 않는다(진행 중인 수업은 처음 값 — 묶음 M 검토 M-3).
 */
export function leadTurnAppliesOf(state: {
  start: { readonly leadMode?: unknown } | null | undefined;
  /** 지금 설정 값(읽지 않음 — 두 값을 가르는 시험이 함께 넘긴다). */
  settings?: { leadMode?: TalkLeadMode } | undefined;
  segment: string;
  level: number;
}): boolean {
  return isLeadSession(state) && LEAD_SEGMENTS.has(state.segment);
}

/**
 * 아이 말 없이 부르는 입구(검토 rev-s2 I-2): start 는 대화 토막을 여는 차례(토막을 넘긴 신호 leadTurn start 뒤 — 대화 첫 질문을 Claude 가
 * 씀), more 는 '더 이야기하기'를 고른 뒤(leadTurn more). 두 입구 모두 아이 행을 만들지 않고 턴 셈에 넣지 않는다.
 */
export type LeadOpen = "start" | "more";

/**
 * 입구를 받는가: start 는 대화 첫 질문 차례(위치 되짚기 firstQuestionDue)일 때, more 는 고를 차례가 남아 있고 마무리 물음이었으면 더 이야기하기
 * 토막으로 넘어간 뒤일 때(묶음 S2 가 토막 · 참여 완료를 먼저 처리한다 — 마무리 제안은 토막 그대로)만 참이다.
 */
export function leadOpenAcceptsOf(
  open: LeadOpen,
  {
    segment,
    firstQuestionDue,
    choice,
  }: {
    segment: string;
    firstQuestionDue: boolean;
    choice: "closing" | "suggestion" | null;
  },
): boolean {
  if (!LEAD_SEGMENTS.has(segment)) return false;
  if (open === "start") return firstQuestionDue && choice === null;
  return (
    choice === "suggestion" || (choice === "closing" && segment === "more_talk")
  );
}

/**
 * 같은 입구를 다시 보냈을 때(연결이 끊겨 다시 부름 등) 다시 흘릴 마지막 선생님 행인가: 그 입구가 쓴 새 엔진 행(move.lead 와 행에 둔 사용자
 * 메시지가 있음 — 아이 행이 없어 선생님 행에 둔다)이고, start 는 대화 첫 질문(first_question), more 는 그 밖의 종류다. 그 입구를 지금 새로
 * 받을 수 있으면(acceptsNew — leadOpenAcceptsOf) 다시 흘리지 않는다: '더 이야기하기' 입구 차례가 마무리 제안으로 끝나면 다음 '더 이야기하기'는
 * 새 차례여야 한다(같은 말 · 두 단추가 되풀이되지 않게 — 고침 L1, 이야기 방식 chatOpenReplayOf 와 같은 규칙 · 검토 rev-chat-s1 I-1).
 */
export function leadOpenReplayOf(
  open: LeadOpen,
  last: Pick<LeadRowLike, "speaker" | "move" | "sentUserMessage"> | undefined,
  acceptsNew: boolean,
): boolean {
  if (acceptsNew) return false;
  if (last?.speaker !== "tori" || !last.sentUserMessage) return false;
  const move = readTalkMove(last.move);
  if (!move?.lead) return false;
  return open === "start"
    ? move.kind === "first_question"
    : move.kind !== "first_question";
}

/**
 * 입구 차례의 겹친 요청 막기 표지(검토 rev-s1 I-3): 아이 차례 길은 호출 전에 저장한 아이 행(시도 id)으로 같은 수업의 진행 중인 턴을 알아보지만,
 * 입구는 호출 전에 남는 행이 없다. 그래서 입구가 세션 잠금 안에서 호출 전에 attempts 에 이 id 의 행(input 은 kind 만 든 LEAD_OPEN_INPUT · 활동
 * 번호 0 · 점수 · 아이 말 없음 — 학습 활동이 아님) 하나를 먼저 넣고, 같은 차례의 두 번째 요청은 그 행 시각부터 지금 길의 막기(turnInFlight)로
 * 가린다. 호출 전에 끝나는 길은 그 행을 지운다(검토 rev-s1-2 N-1). 끝맺음 기록 · 처음 스냅숏과 같은 꼴의 세션 표지 행이다.
 */
export function leadOpenAttemptId(sessionId: string, turnNo: number): string {
  return `talk-lead-open:${sessionId}:${turnNo}`;
}
/** 입구 표지 행의 활동 번호(학습 활동이 아니라 0 — 끝맺음 기록 TALK_CLOSING_ACTIVITY_NO 와 같은 값). */
export const LEAD_OPEN_ACTIVITY_NO = 0;
/**
 * 입구 표지 행의 input(처음 스냅숏과 같은 성격 — 점수 · 단어 결과 · 아이 말 없음). 행이 무엇인지 드러나게 kind 를 둔다. attempts 를 읽는 자리는
 * 모두 꼴 검사(parseTalkAttemptInput · parseAttemptInput — 모르는 kind 는 undefined)나 id 머리 · 활동 번호로 거르므로 이 행에 닿지 않는다.
 */
export const LEAD_OPEN_INPUT = { v: 1, kind: "talk-lead-open" } as const;

/** 입구의 아이 입력 줄: start 는 없음(인사 이음 + 'The talk part starts now.' 사실 줄), more 는 '(The child chose to talk more.)'. */
export function leadOpenChildOf(open: LeadOpen): TalkLeadChild | null {
  return open === "more" ? { kind: "more_talk" } : null;
}

// ── 사실 알림의 값(spec 설계 2 '사실 알림' 표) ─────────────────────────

/** 대화 기록 · 사실 값이 읽는 talk_turns 행의 칸(서버 행 · 대본 도구의 행이 같은 꼴). */
export type LeadRowLike = {
  speaker: "child" | "tori";
  turnNo: number;
  segment: string;
  text: string | null;
  move?: unknown;
  toriRewrite?: string | null;
  sentUserMessage?: string | null;
};

/** 대화 차례(턴 번호, 같은 번호면 선생님 행이 먼저 — 아이 행은 그 앞 선생님 행의 번호를 쓴다). */
export function leadConversationOrder<R extends LeadRowLike>(
  rows: readonly R[],
): R[] {
  return [...rows].sort(
    (a, b) =>
      a.turnNo - b.turnNo ||
      (a.speaker === b.speaker ? 0 : a.speaker === "tori" ? -1 : 1),
  );
}

/** 아이 입력 줄의 갈래(실험 C 의 세 꼴): 말은 들린 글, '잘 모르겠어요' 단추, 말소리 없음. */
export function leadChildOf({
  mode,
  nospeech,
  heard,
}: {
  mode: "speech" | "dont_know";
  nospeech: boolean;
  heard: string;
}): TalkLeadChild {
  if (mode === "speech") return { kind: "speech", heard };
  return nospeech ? { kind: "silent" } : { kind: "dont_know" };
}

/**
 * 'Child turn <n> (the app offers to finish around turn <r>)'(검토 I-2): n 은 대화 토막(더 이야기하기 포함)의 아이 차례 번호(이번 차례 포함, 막힘 ·
 * 말소리 없음도 셈), r 은 앱이 마무리를 묻는 차례 — 이 차례 앞의 남은 말 턴(위치 되짚기 turnsLeft: 참고 턴까지, 더 이야기하기면 그 한 바퀴 끝까지)을
 * 이 차례부터 센 번호다. 이미 닿았으면 이 차례다.
 */
export function leadChildTurnOf({
  rows,
  turnsLeft,
}: {
  rows: readonly Pick<LeadRowLike, "speaker" | "segment">[];
  turnsLeft: number;
}): { n: number; offerAt: number } {
  const n =
    rows.filter((r) => r.speaker === "child" && LEAD_SEGMENTS.has(r.segment))
      .length + 1;
  return { n, offerAt: n - 1 + Math.max(1, turnsLeft) };
}

/** 이 수업 앞 선생님 행들의 도움 수(C238 (1) 도움 기록): 쉬운 질문 · 고르기 · 따라 할 문장. 새 엔진 행(move.lead)만 센다. */
export function leadHelpCountsOf(
  moves: readonly (TalkMove | null)[],
): TalkLeadHelpCounts {
  const counts = { easierQuestion: 0, choices: 0, modelSentence: 0 };
  for (const move of moves) {
    const lead = move?.lead;
    if (!lead) continue;
    if (lead.choices === true) counts.choices += 1;
    else if (lead.move === "easier_or_choices") counts.easierQuestion += 1;
    if (lead.move === "model_repeat" || lead.model !== undefined)
      counts.modelSentence += 1;
  }
  return counts;
}

/** 앞 선생님 행에서 앱이 확인한 따라 할 문장(말 칸에 그대로 든 것만 — lead.model.inSay). 없으면 undefined. */
export function leadLastModelOf(move: TalkMove | null): string | undefined {
  const model = move?.lead?.model;
  return model?.inSay === true && model.sentence.trim() !== ""
    ? model.sentence
    : undefined;
}

/**
 * move 의 소리 줄을 이 차례에 실제로 낸 소리 줄로 맞춘다(같은 시도 다시 흘림이 같은 줄을 내게 — lessonReplayLinesOf 는 move.sound 를 읽는다).
 * 다음 아이 차례의 들은 도움 · 힌트 종류 · '말했다'에 닿으므로 서버 턴 길과 대본 도구가 같이 부른다(검토 rev-s1-3 O-2, 식은 lead-turn.ts 에서 그대로 옮김).
 */
export function leadMoveWithSound(
  move: TalkMove,
  sound: { model?: string; answer?: string },
): TalkMove {
  const { sound: _ignored, ...rest } = move;
  return sound.model === undefined && sound.answer === undefined
    ? rest
    : { ...rest, sound: { ...sound } };
}

/**
 * 새 엔진 소리 줄의 표지(흘려 보낼 줄의 선택 칸 lead — 지금 길의 줄에는 없다): ask 는 1~3단계 막힌 뒤 고르기 물음(kind answer 가 받침의 답이
 * 아니라 물음 — 듣기 단추의 접근 이름, 화면 검토 M-1), kept 는 되묻는 차례에 그대로 둔 앞 차례의 소리 줄(저절로 읽지 않고 누르면 들림 — I-1).
 */
export type LeadSoundMark = { ask?: true; kept?: true };
/** 새 엔진이 흘려 보내는 소리 줄 하나(lesson-turn TalkLessonLine 의 sound 와 같은 꼴). */
export type LeadSoundLine = {
  t: "sound";
  kind: "model" | "answer";
  say: string;
  lead?: LeadSoundMark;
  /**
   * 저장된 행에서 다시 만든 줄만(leadRowSoundLinesOf): 글 사이에서 읽은 소리 줄의 자리(행 글 첫 줄의 글자 수 — move.lead · move.chat 의
   * soundAt). 받는 쪽이 이 자리에서 글을 나눠 소리 줄을 끼우고(leadPlacedLinesOf · 화면 lessonBubbleOf), 흘려 보내는 줄에는 싣지 않는다.
   */
  at?: number;
};

/**
 * 되묻는 차례에 그대로 둘 앞 차례의 소리 줄(정본 03 4절 98줄 'Claude 주도 방식은 … 1~3단계는 앞 차례의 글 없는 듣기 버튼을 그대로 둔다' ·
 * spec 150줄, 화면 검토 I-1): 1~3단계의 아이 말 차례이고 move 가 ask_again 이며 이 차례 응답에 제 소리 줄이 없을 때, 바로 앞 선생님 행이
 * 화면에 보인 소리 줄(따라 할 문장 model · 막힌 뒤 고르기 물음 answer)을 그대로 돌려준다. 행 move.sound 에는 적지 않는다(다음 아이 차례의
 * 들은 도움 · 힌트 종류 · '말했다'의 입력을 바꾸지 않게 — leadMoveWithSound). 아니면 빈 값.
 *
 * 앞 행이 보인 소리 줄: rows(이 차례 앞의 살아 있는 행)를 주면 그 마지막 선생님 행이 보인 줄(제 move.sound, 그 행도 되묻는 차례로 앞 줄을
 * 그대로 뒀으면 그 줄 — 되묻기가 둘 넘게 이어져도 듣기 단추가 남는다, 검토 rev-s5 M-1)이고, rows 가 없으면 prevMove.sound 다.
 */
export function leadKeptSoundOf({
  level,
  move,
  hasChild,
  own,
  prevMove,
  rows,
}: {
  level: number;
  move: TalkLeadMove | undefined;
  hasChild: boolean;
  /** 이 차례 응답이 낸 소리 줄(leadSettleOf sound). */
  own: { model?: string; answer?: string };
  prevMove: TalkMove | null;
  /** 이 차례 앞의 살아 있는 행(이 차례의 선생님 행은 넣지 않는다 — 마지막 선생님 행이 바로 앞 행). */
  rows?: readonly LeadRowLike[];
}): { model?: string; answer?: string } {
  if (!isLowBandLevel(level) || !hasChild || move !== "ask_again") return {};
  if (own.model !== undefined || own.answer !== undefined) return {};
  const prev =
    rows === undefined ? prevMove?.sound : leadLastShownSoundOf(level, rows);
  return {
    ...(prev?.model ? { model: prev.model } : {}),
    ...(prev?.answer ? { answer: prev.answer } : {}),
  };
}

/**
 * 행 목록의 마지막 선생님 행이 화면에 보인 소리 줄(leadKeptSoundOf 의 앞 행 — 새 엔진 응답 행은 leadRowSoundLinesOf 로 다시 만든 줄, 그 밖의
 * 행은 move.sound). 선생님 행이 없으면 빈 값.
 */
function leadLastShownSoundOf(
  level: number,
  rows: readonly LeadRowLike[],
): { model?: string; answer?: string } {
  const ordered = leadConversationOrder(rows);
  const prev = ordered.findLast((r) => r.speaker === "tori");
  if (prev === undefined) return {};
  const lines = leadRowSoundLinesOf({ level, rows: ordered, teacher: prev });
  if (lines === null) return readTalkMove(prev.move)?.sound ?? {};
  const model = lines.find((l) => l.kind === "model")?.say;
  const answer = lines.find((l) => l.kind === "answer")?.say;
  return {
    ...(model === undefined ? {} : { model }),
    ...(answer === undefined ? {} : { answer }),
  };
}

/**
 * 저장된 선생님 행에서 다시 만든 새 엔진 소리 줄(같은 시도 다시 흘림 · 쪽을 다시 연 이어 하기 — 컨트롤러 지킬 것 2): 행이 새 엔진의 응답 행
 * (move.lead)일 때만 만든다. 이 차례의 소리 줄은 행 move.sound(실시간 길이 낸 그대로 — leadMoveWithSound), 그대로 둘 앞 차례의 소리 줄은 행
 * move.lead.move · 대화 차례에서 이 행 앞의 행(바로 앞 선생님 행이 보인 줄 — 되묻기가 이어지면 거슬러 감) · 아이 말 차례인가(입구 차례는 행에
 * 사용자 메시지를 둔다)로 실시간 길과 같은 leadKeptSoundOf 를 다시 부른다. 그 밖의 행(지금 길 · 옛 행 · 응답이 없던 새 엔진 차례)은 null —
 * 부르는 쪽이 지금 꼴의 줄을 낸다.
 */
export function leadRowSoundLinesOf<R extends LeadRowLike>({
  level,
  rows,
  teacher,
}: {
  level: number;
  /** 이 수업의 살아 있는 행(teacher 포함). */
  rows: readonly R[];
  teacher: R;
}): LeadSoundLine[] | null {
  const move = readTalkMove(teacher.move);
  // 이야기 방식 행(move.chat)은 글 사이에서 읽은 소리 줄이 있을 때만 그 자리를 실은 줄(표지 없음 — 실시간 길과 같은 꼴), 아니면 지금 꼴(null)
  if (!move?.lead) {
    const at = move?.chat?.soundAt;
    if (at === undefined || move?.sound === undefined) return null;
    return withSoundAt(
      leadSoundLinesOf({
        sound: {
          ...(move.sound.model ? { model: move.sound.model } : {}),
          ...(move.sound.answer ? { answer: move.sound.answer } : {}),
        },
      }).map(({ lead: _mark, ...line }) => line),
      at,
    );
  }
  const ordered = leadConversationOrder(rows);
  const at = ordered.findIndex(
    (r) => r.speaker === "tori" && r.turnNo === teacher.turnNo,
  );
  // 행 목록에 그 행이 없으면 목록 전부가 이 행 앞이다
  const before = at < 0 ? ordered : ordered.slice(0, at);
  const prev = before.findLast((r) => r.speaker === "tori") ?? null;
  const own = {
    ...(move.sound?.model ? { model: move.sound.model } : {}),
    ...(move.sound?.answer ? { answer: move.sound.answer } : {}),
  };
  const kept = leadKeptSoundOf({
    level,
    move: move.lead.move,
    hasChild: (teacher.sentUserMessage ?? null) === null,
    own,
    prevMove: readTalkMove(prev?.move),
    rows: before,
  });
  return withSoundAt(leadSoundLinesOf({ sound: own, kept }), move.lead.soundAt);
}

/** 이 차례의 소리 줄(kept 가 아닌 줄)에 행의 소리 줄 자리를 싣는다(자리가 없으면 그대로). */
function withSoundAt(
  lines: LeadSoundLine[],
  at: LowBandSoundAt | undefined,
): LeadSoundLine[] {
  if (at === undefined) return lines;
  return lines.map((line) => {
    const pos = line.lead?.kept === true ? undefined : at[line.kind];
    return pos === undefined ? line : { ...line, at: pos };
  });
}

/**
 * 저장된 행의 글(행 글 첫 줄)과 다시 만든 소리 줄(leadRowSoundLinesOf) → 다시 흘릴 줄 차례(같은 시도 다시 흘림 — 13절 C241 보완 7): 글 줄은
 * 소리 줄 자리에서 나눈 조각마다 문장으로, 자리(at)가 있는 소리 줄은 그 앞 글 줄 뒤에 끼운다(실시간 길 leadSettleOf 의 lines 와 같은 차례). 나머지
 * 소리 줄(자리 없음 · 그대로 둔 앞 차례 줄)은 tail 로 돌려 부르는 쪽이 뜻 줄 뒤에 낸다. 소리 줄이 없으면 글 줄은 splitSentences 그대로다.
 * 흘려 보내는 줄에는 at 을 싣지 않는다.
 */
export function leadPlacedLinesOf(
  text: string,
  sound: readonly LeadSoundLine[],
): {
  lines: ({ t: "s"; en: string } | LeadSoundLine)[];
  tail: LeadSoundLine[];
} {
  const placedLine = (kind: "model" | "answer") =>
    sound.find((l) => l.kind === kind && l.at !== undefined);
  const at: LowBandSoundAt = {};
  for (const kind of ["model", "answer"] as const) {
    const line = placedLine(kind);
    if (line?.at !== undefined) at[kind] = line.at;
  }
  const strip = ({ at: _at, ...line }: LeadSoundLine): LeadSoundLine => line;
  const lines: ({ t: "s"; en: string } | LeadSoundLine)[] = [];
  const used = new Set<LeadSoundLine>();
  for (const line of lowBandPlacedLinesOf(text, at)) {
    if (line.t === "s") {
      lines.push(line);
      continue;
    }
    const sl = placedLine(line.kind);
    if (sl === undefined) continue;
    used.add(sl);
    lines.push(strip(sl));
  }
  return {
    lines,
    tail: sound.filter((l) => !used.has(l)).map(strip),
  };
}

/**
 * 새 엔진 응답 차례의 흘림 뒤 줄 차례(서버 턴 길 · 대본 도구가 같이 부름 — 13절 C241 보완 7): 지금 낼 글 줄과 글 사이의 소리 줄(leadSettleOf
 * lines — 뺀 자리 앞 글 줄 → 소리 줄 → 뒤 글 줄) → 뜻 줄(빈 글이면 없음) → 글 뒤의 소리 줄(이 차례의 따라 할 문장 · 고르기 물음 가운데 뒤에 글이
 * 없는 것) → 그대로 둔 앞 차례의 소리 줄(kept). 표지는 leadSoundLinesOf 그대로다.
 */
export function leadTurnLinesOf({
  lines,
  sound,
  kept = {},
  ko,
}: {
  lines: readonly LowBandPlacedLine[];
  sound: { model?: string; answer?: string };
  kept?: { model?: string; answer?: string };
  ko: string;
}): ({ t: "s"; en: string } | { t: "ko"; ko: string } | LeadSoundLine)[] {
  const own = leadSoundLinesOf({ sound });
  const placed = new Set<"model" | "answer">();
  const out: (
    | { t: "s"; en: string }
    | { t: "ko"; ko: string }
    | LeadSoundLine
  )[] = [];
  for (const line of lines) {
    if (line.t === "s") {
      out.push(line);
      continue;
    }
    const sl = own.find((l) => l.kind === line.kind);
    if (sl === undefined || placed.has(line.kind)) continue;
    placed.add(line.kind);
    out.push(sl);
  }
  if (ko !== "") out.push({ t: "ko", ko });
  out.push(...own.filter((l) => !placed.has(l.kind)));
  out.push(...leadSoundLinesOf({ sound: {}, kept }));
  return out;
}

/**
 * 새 엔진이 흘려 보낼 소리 줄(서버 턴 길 · 대본 도구가 같이 부름): 이 차례의 따라 할 문장 → 고르기 물음 → 그대로 둔 앞 차례의 소리 줄(kept).
 * 고르기 물음 줄에는 ask 표지를 단다. 차례는 지금 길과 같다(model 다음 answer).
 */
export function leadSoundLinesOf({
  sound,
  kept = {},
}: {
  sound: { model?: string; answer?: string };
  kept?: { model?: string; answer?: string };
}): LeadSoundLine[] {
  const out: LeadSoundLine[] = [];
  if (sound.model !== undefined)
    out.push({ t: "sound", kind: "model", say: sound.model });
  if (sound.answer !== undefined)
    out.push({
      t: "sound",
      kind: "answer",
      say: sound.answer,
      lead: { ask: true },
    });
  if (kept.model !== undefined)
    out.push({
      t: "sound",
      kind: "model",
      say: kept.model,
      lead: { kept: true },
    });
  if (kept.answer !== undefined)
    out.push({
      t: "sound",
      kind: "answer",
      say: kept.answer,
      lead: { ask: true, kept: true },
    });
  return out;
}

/**
 * 'Sound note' 줄의 값(spec 설계 2 · C217): 지금 들은 글 귀띔(heardHintsOf)에 앞 선생님 질문이 노린 단원 단어(새 엔진 행은 물음 문장에 든 단원
 * 단어 lead.asked, 지금 길 행은 move.words)를 '답 낱말'로 넘긴다. 답 예시는 넘기지 않는다 — Claude 의 hint_en 에 들은 낱말이 함께 들면('I see
 * the sea.') 'See.' 가 맞게 들린 말로 읽혀 귀띔이 사라지기 때문이다. 그래서 단원 단어 see · sea 가 함께 있는 3단계 단원 1 에서도 'Do you go to
 * the sea?' 뒤 'See.' 는 see → sea 귀띔이 나간다(묶음 R1 보고 확인할 것 5). 장면 낱말은 단원 단어다. 두 낱말이 넘는 말은 빈 목록이다.
 */
export function leadSoundNotesFor({
  heard,
  prevMove,
  unitWords,
  homophones,
  soundAlikes,
  lemmaOf,
}: {
  heard: string;
  prevMove: TalkMove | null;
  unitWords: readonly string[];
  homophones: readonly (readonly string[])[];
  soundAlikes: readonly SoundAlikeEntry[];
  lemmaOf: (surface: string) => string | undefined;
}): TalkLeadSoundNote[] {
  const targets = prevMove?.lead?.asked ?? prevMove?.words ?? [];
  const hints = heardHintsOf({
    heard,
    answer: null,
    targets,
    scene: unitWords,
    homophones,
    soundAlikes,
    lemmaOf,
  });
  return talkLeadSoundNotesOf(heard, hints);
}

/**
 * 새 엔진의 첫 차례인가(인사 이음과 'The talk part starts now.' 를 싣는 차례 — 검토 rev-s1 M-1): 대화 토막(대화 · 더 이야기하기)의 선생님 행이
 * 아직 없을 때만 참이다. 대화 기록 쌍(leadHistoryOf)으로 정하지 않는다 — 입구 차례가 실패해 카드 안전한 대사로 닫힌 행은 기록 쌍이 없어,
 * 그것으로 정하면 다음 아이 차례에 인사 이음이 한 번 더 실린다.
 */
export function leadFirstTurnOf(
  rows: readonly Pick<LeadRowLike, "speaker" | "segment">[],
): boolean {
  return !rows.some(
    (r) => r.speaker === "tori" && LEAD_SEGMENTS.has(r.segment),
  );
}

/**
 * 대화 기록(spec 설계 2 '대화 기록'): 새 엔진 선생님 행(move.lead 와 응답 원문 tori_rewrite 가 있음)마다 바로 앞 아이 행의 보낸 사용자 메시지
 * (아이 말 없이 부른 차례는 그 선생님 행의 것)와 그 응답 원문 한 쌍. 앱이 고른 한 줄로 닫힌 차례(응답 없음)와 지금 길 행은 넣지 않는다.
 */
export function leadHistoryOf(
  rows: readonly LeadRowLike[],
): TalkLeadHistoryEntry[] {
  const ordered = leadConversationOrder(rows);
  const out: TalkLeadHistoryEntry[] = [];
  ordered.forEach((row, i) => {
    if (row.speaker !== "tori") return;
    if (!readTalkMove(row.move)?.lead || !row.toriRewrite) return;
    // 아이 말 없이 부른 차례(입구 start · more)는 사용자 메시지를 선생님 행에 둔다
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

/**
 * 새 엔진 첫 호출의 인사 이음(검토 I-5): 그때까지의 선생님 말(화면 글 줄을 이은 것) · 아이의 들린 글을 차례대로. 말로 답하지 않은 아이 행
 * (단추 · 말소리 없음)은 넣지 않는다.
 */
export function leadGreetingOf(
  rows: readonly LeadRowLike[],
): TalkLeadGreetingLine[] {
  const out: TalkLeadGreetingLine[] = [];
  for (const row of leadConversationOrder(rows)) {
    const text = (row.text ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l !== "")
      .join(" ");
    if (text === "") continue;
    out.push({ speaker: row.speaker === "tori" ? "teacher" : "child", text });
  }
  return out;
}

// ── 흘려 받는 동안(spec 설계 6 · 8) ─────────────────────────────────

/** 앞 칸 값(reading · move)을 받는 붙잡기 묻기(R6 TalkLeadHoldSay 와 같은 꼴). */
export type LeadHeads = Readonly<Record<string, string | boolean>>;

const MOVE_SET: ReadonlySet<string> = new Set(TALK_LEAD_MOVES);

function moveOfHeads(heads: LeadHeads): TalkLeadMove | undefined {
  const m = heads.move;
  return typeof m === "string" && MOVE_SET.has(m)
    ? (m as TalkLeadMove)
    : undefined;
}

/**
 * 말 칸 전체를 끝까지 받아 둘 차례인가(spec 설계 8 둘째 줄): 1~3단계의 model_repeat 차례만. 따라 할 문장을 글에서 빼려면 응답 끝의 model_sentence
 * 를 알아야 하기 때문이다. 그 밖의 차례는 첫 문장을 바로 내보낸다.
 */
export function leadHoldSayOf(level: number): (heads: LeadHeads) => boolean {
  const low = isLowBandLevel(level);
  return (heads) => low && moveOfHeads(heads) === "model_repeat";
}

/** 기록 · 다시 말하기가 보는 물음 문장(물음표 문장 · 앱 고정 마무리 물음은 뺌). */
export function isLeadAskedSentence(sentence: string): boolean {
  return isQuestionSentence(sentence) && !isClosingQuestion(sentence);
}

/**
 * 이 아이 차례의 막힘(지금 판정의 입력, spec 설계 4 넷째 줄): 말로 답한 차례만 응답의 reading 을 막힘 값과 아이 말 갈래로 옮긴 뒤 지금 무름
 * (effectiveStuckOf)을 건다(묶음 R2 leadStuckOf). 단추 · 말소리 없음 차례는 거짓(그 까닭은 childCauseOf 가 따로 본다). reading 이 열거 밖이면 거짓.
 */
export function leadChildStuckOf({
  reading,
  mode,
  heard,
  sceneWords,
  homophones,
}: {
  reading: unknown;
  mode: "speech" | "dont_know";
  heard: string;
  sceneWords: ReadonlySet<string>;
  homophones: readonly (readonly string[])[];
}): boolean {
  if (mode !== "speech" || typeof reading !== "string") return false;
  if (!(TALK_LEAD_READINGS as readonly string[]).includes(reading))
    return false;
  return leadStuckOf({
    reading: reading as TalkLeadReading,
    child: heard,
    input: mode,
    sceneWords,
    homophones,
  }).stuck;
}

/**
 * 흘려 받는 문장 흐름(문장 문을 지난 문장마다): 물음 문장 가운데 (가) 좁은 정의에 걸린 것(마무리 차례 · move wrap_up 차례 밖, spec 설계 6 (나))과
 * (나) 1~3단계 막힌 뒤 고르기가 될 수 있는 차례(easier_or_choices 이거나 앞 아이 차례가 막힘, 마무리 차례 · wrap_up 밖 — leadChoicesOf 와 같은 조건)의
 * 물음 문장은 내보내기 전에 붙잡고, 그 뒤 문장도 함께 붙잡는다(나뉜 고르기 'Beach? Or mountain?' 을 함께 보려고). 붙잡은 문장은 끝에서
 * leadSettleOf 가 정한다. 그 앞에 나간 반응 문장은 바뀌지 않는다.
 */
export function createLeadSentenceFlow({
  low,
  closing,
  prevStuck,
  hitsOf,
}: {
  low: boolean;
  closing: boolean;
  /**
   * 이 선생님 차례 바로 앞 아이 차례가 막힘인가(단추는 처음부터 알고, 말은 응답의 reading 으로 정한다 — 앞 칸이라 첫 문장 전에 온다,
   * leadChildStuckOf).
   */
  prevStuck: boolean | ((heads: LeadHeads) => boolean);
  /** 좁은 정의 걸림(검사를 못 하는 차례면 늘 빈 목록). */
  hitsOf: (sentence: string) => readonly LeadNarrowHit[];
}) {
  let move: TalkLeadMove | undefined;
  let stuck = typeof prevStuck === "boolean" ? prevStuck : false;
  let holding = false;
  let sent = 0;
  return {
    /** 시도마다 첫 문장 전에 받은 앞 칸 값. */
    heads(heads: LeadHeads): void {
      move = moveOfHeads(heads) ?? move;
      if (typeof prevStuck === "function") stuck = prevStuck(heads);
    },
    /** 이 문장을 지금 내보내는가(거짓이면 붙잡음). */
    accept(sentence: string): boolean {
      if (holding) return false;
      if (isLeadAskedSentence(sentence)) {
        const checkable = !closing && move !== "wrap_up";
        const choice =
          low && checkable && (move === "easier_or_choices" || stuck);
        if (choice || (checkable && hitsOf(sentence).length > 0)) {
          holding = true;
          return false;
        }
      }
      sent += 1;
      return true;
    },
    /** 지금까지 바로 내보낸 앞 문장 수. */
    sentCount: (): number => sent,
    /** 앞 칸에서 읽은 move(응답이 끊겨 값이 없는 차례의 끝 처리 — 못 읽었으면 undefined). */
    move: (): TalkLeadMove | undefined => move,
    /** 앞 칸으로 정한 앞 아이 차례 막힘. */
    prevStuck: (): boolean => stuck,
    /** 문장을 붙잡기 시작했다(첫 문장부터 붙잡았으면 sentCount 가 0 — 받아 둔 차례의 기록). */
    held: (): boolean => holding,
  };
}

/** 좁은 정의 다시 말하기를 요청할 질문(한 차례에 하나 — 처음 걸린 물음 문장). 마무리 차례 · move wrap_up 차례는 없다(재검토 M2-1). */
export function leadNarrowTargetOf(
  sentences: readonly string[],
  {
    closing,
    move,
    hitsOf,
  }: {
    closing: boolean;
    move: TalkLeadMove;
    hitsOf: (sentence: string) => readonly LeadNarrowHit[];
  },
): { index: number; sentence: string; hits: LeadNarrowHit[] } | null {
  if (closing || move === "wrap_up") return null;
  for (const [index, sentence] of sentences.entries()) {
    if (!isLeadAskedSentence(sentence)) continue;
    const hits = hitsOf(sentence);
    if (hits.length > 0) return { index, sentence, hits: [...hits] };
  }
  return null;
}

// ── 끝에서 낼 글과 소리 줄(spec 설계 8 · 데이터 절) ─────────────────────

export type LeadSettleInput = {
  level: number;
  move: TalkLeadMove;
  prevStuck: boolean;
  closing: boolean;
  modelSentence: string;
  /** 문장 문을 지난 말 칸 문장(차례대로 — 안전 대사로 바뀐 자리 포함). */
  sentences: readonly string[];
  /** 흘려 받는 동안 바로 내보낸 앞 문장 수(말 칸 전체를 붙잡은 차례는 0). */
  sentCount: number;
  /** 말 칸 전체를 붙잡은 차례(1~3단계 model_repeat — leadHoldSayOf). */
  held: boolean;
  /** 좁은 정의 다시 말하기로 정한 그 자리의 문장(다시 받은 문장이거나 원래 질문). */
  narrow: { index: number; sentence: string } | null;
};

export type LeadSettled = {
  /** 아이에게 소리로 나간 말(문장 문 · 다시 말하기를 지난 글 — 1~3단계에서 글로 뺀 문장도 든다). */
  say: string;
  /** 지금 내보낼 글 문장(앞서 나간 문장 뒤). */
  release: string[];
  /**
   * 지금 내보낼 줄 차례(13절 C241 보완 7): release 의 글 줄과, 뒤에 글이 남는 소리 줄의 제자리(slot — 뺀 자리 앞 글 줄 → 소리 줄 → 뒤 글 줄).
   * 뒤에 글이 없는 소리 줄은 slot 이 없다(뜻 줄 뒤, 지금 차례 — leadTurnLinesOf).
   */
  lines: LowBandPlacedLine[];
  /** 화면 글 문장 전체(앞서 나간 것 + release) — 선생님 행 text 의 첫 줄. */
  shown: string[];
  /** 1~3단계 소리 줄: 확인된 따라 할 문장 · 막힌 뒤 고르기 물음(둘 이상이면 이은 한 줄 — 듣기 단추 하나). */
  sound: { model?: string; answer?: string };
  /** 글 사이에서 읽는 소리 줄의 자리(shown 을 이은 글의 글자 수 — move.lead.soundAt). 모두 글 뒤면 빈 값. */
  soundAt: LowBandSoundAt;
  /** 글에서 뺀 문장(move.lead.removed). */
  removed: string[];
  /** 소리 줄 뒤에 글이 남아 단추 자리가 원래 차례와 다르다(move.lead.soundMoved — 미결 11 의 화면 판단 재료). */
  soundMoved: boolean;
};

/**
 * 끝에서 낼 글 · 소리 줄(spec 설계 8 · 13절 C241 보완 7): 다시 받은 질문을 그 자리에 넣은 말 칸에 1~3단계 글 빼기(leadLowBandShownOf, 묶음 R5)를
 * 건다. 말 칸 전체를 붙잡은 차례는 정리한 화면 글을 뺀 자리에서 나눠 문장으로, 흘려 보낸 차례는 붙잡은 문장 가운데 뺀 것만 빼고 차례대로 낸다(앞서
 * 나간 문장은 그대로). 소리 줄은 뺀 자리(같은 문장이 두 자리면 마지막 자리)에서 읽는다 — 뒤에 글이 남으면 그 글 앞(slot), 아니면 글 뒤. 그 밖에는
 * 말을 고치지 않는다.
 */
export function leadSettleOf(input: LeadSettleInput): LeadSettled {
  const finals = input.sentences.map((s, i) =>
    input.narrow !== null && i === input.narrow.index
      ? input.narrow.sentence
      : s,
  );
  const say = finals.join(" ");
  const low = leadLowBandShownOf({
    level: input.level,
    move: input.move,
    say,
    modelSentence: input.modelSentence,
    prevStuck: input.prevStuck,
    closing: input.closing,
  });
  const modelSound =
    low.model?.removed === true && low.model.sentence !== ""
      ? low.model.sentence
      : undefined;
  const choiceSpans = low.removed.filter((r) => r !== modelSound);
  const sound = {
    ...(modelSound === undefined ? {} : { model: modelSound }),
    ...(choiceSpans.length === 0 ? {} : { answer: choiceSpans.join(" ") }),
  };
  const settled = (
    prefix: string[],
    lines: LowBandPlacedLine[],
  ): LeadSettled => {
    const release = lines.flatMap((l) => (l.t === "s" ? [l.en] : []));
    const soundAt = lowBandSoundAtOf(lines, prefix);
    return {
      say,
      release,
      lines,
      shown: [...prefix, ...release],
      sound,
      soundAt,
      removed: low.removed,
      soundMoved: Object.keys(soundAt).length > 0,
    };
  };
  if (input.held) {
    return settled(
      [],
      lowBandPlacedLinesOf(low.text, {
        ...(modelSound === undefined ? {} : { model: low.soundAt.model }),
        ...(choiceSpans.length === 0 ? {} : { answer: low.soundAt.answer }),
      }),
    );
  }
  // 흘려 보낸 차례: 뺀 것은 붙잡은 문장 통째(고르기 물음)다. 소리 줄은 그 갈래의 마지막 뺀 문장 자리 — 뒤에 남은 글 문장이 있을 때만 그 앞
  const removedOf = (s: string) =>
    s.trim() === "" ? undefined : low.removed.find((r) => r.includes(s.trim()));
  const prefix = finals.slice(0, input.sentCount);
  const rest = finals.slice(input.sentCount);
  const kinds = rest.map((s) => {
    const piece = removedOf(s);
    if (piece === undefined) return null;
    return piece === modelSound ? ("model" as const) : ("answer" as const);
  });
  const release = rest.filter((_, i) => kinds[i] === null);
  const slotAt = (kind: "model" | "answer") => {
    const last = kinds.lastIndexOf(kind);
    if (last < 0) return null;
    const before = kinds.slice(0, last).filter((k) => k === null).length;
    return before < release.length ? before : null;
  };
  const lines: LowBandPlacedLine[] = [];
  const slots = (["model", "answer"] as const).flatMap((kind) => {
    const before = slotAt(kind);
    return before === null ? [] : [{ kind, before }];
  });
  release.forEach((en, i) => {
    for (const slot of slots)
      if (slot.before === i)
        lines.push({ t: "slot", kind: slot.kind, before: i });
    lines.push({ t: "s", en });
  });
  return settled(prefix, lines);
}

/** 마무리 차례에 앱이 지금 상수 물음을 붙이는가(spec 설계 3 마무리 물음): 말 칸에 물음 문장이 없을 때만. */
export function leadClosingAddsOf({
  closing,
  say,
}: {
  closing: boolean;
  say: string;
}): boolean {
  return closing && !splitSentences(say).some(isLeadAskedSentence);
}

// ── 선생님 행 ai_question(데이터 절) ────────────────────────────────

/** 선생님 행 ai_question 칸(지금 꼴 — lesson-turn LessonAiQuestion · state AiQuestionSchema 와 같은 칸). */
export type LeadAiQuestion = {
  en: string;
  ko: string;
  answerExample: string;
  hintKo?: string;
  hints?: string[];
};

/**
 * 새 엔진 행의 ai_question: 화면 글의 그 차례 질문(위치 되짚기와 같은 turnQuestionOf 값 — 힌트 단이 이 칸을 질문 글로 찾는다) · 뜻 줄 · 힌트 재료.
 * 힌트가 검사를 지났으면 답 예시는 hint_en, 뜻 · 영어 단은 leadAiHintsOf 의 값이고, 아니면 힌트 칸 없이 둔다(그 턴은 힌트 단추 없음). 질문이 없으면 null.
 */
export function leadAiQuestionOf({
  question,
  ko,
  hintEn,
  hints,
}: {
  question: string | null;
  ko: string;
  hintEn: string;
  hints: AiHints | undefined;
}): LeadAiQuestion | null {
  if (question === null) return null;
  return {
    en: question,
    ko,
    answerExample: hints === undefined ? "" : hintEn.trim(),
    ...(hints === undefined
      ? {}
      : { hintKo: hints.hintKo, hints: [...hints.hints] }),
  };
}

// ── 좁은 정의 다시 말하기 호출(spec 설계 6 (나), 브리프 3) ─────────────────

/** 다시 말하기 응답 규격의 이름(가짜 클라이언트가 가르는 표시). */
export const TALK_LEAD_RETRY_TITLE = "talk_lead_retry";

/** 다시 말하기 입력: 이 차례까지의 N 입력 + 이 차례 응답 원문(assistant) + 요청 글(leadNarrowRetryPrompt). */
export type TalkLeadRetryInput = TalkLeadInput & {
  retry: { assistant: string; prompt: string };
};

/** 한 칸짜리 응답(질문 문장 하나 — 안내문의 'Output JSON only' 와 부딪히지 않게 JSON 한 칸으로 받는다). */
export const TalkLeadRetryOutputSchema = z.object({ question: z.string() });
export type TalkLeadRetryOutput = z.infer<typeof TalkLeadRetryOutputSchema>;

/**
 * 다시 말하기 한 번의 호출 규격: 목적 · 설정 키 · 안내문 · 가림은 N 회화 턴과 같고(캐시), 메시지는 이 차례까지의 기록 뒤에 이 차례 응답 원문과 요청
 * 글 하나를 더한다. 받은 칸의 글은 부르는 쪽이 받는 조건(leadNarrowRetryAccepted)과 안전 검사에 넘긴다. 출력 검사에 걸린 칸은 비운다(원래 질문이 나감).
 */
export const talkLeadRetrySpec: CallSpec<
  TalkLeadRetryInput,
  TalkLeadRetryOutput,
  TalkLeadRules
> = {
  purpose: "talk_turn",
  title: TALK_LEAD_RETRY_TITLE,
  wireSchema: () => TalkLeadRetryOutputSchema,
  looseSchema: z.object({ question: z.unknown() }),
  multiTurn: true,
  enumPaths: [],
  settingSchemas: talkLeadTurnSpec.settingSchemas,
  rulesOf: (values, input) => talkLeadTurnSpec.rulesOf(values, input),
  mask: (input, masker) => ({
    ...talkLeadTurnSpec.mask(input, masker),
    retry: input.retry,
  }),
  system: (input, rules) => talkLeadSystem(input, rules),
  messages: (input): ChatMessage[] => [
    ...talkLeadMessages(input),
    { role: "assistant", content: input.retry.assistant },
    { role: "user", content: input.retry.prompt },
  ],
  validate: () => [],
  normalize: (loose) => {
    const q = (loose as { question?: unknown } | null | undefined)?.question;
    return typeof q === "string" ? { question: q } : null;
  },
  checkFields: (value) => [
    { path: "question", lang: "en", text: value.question, checkLength: false },
  ],
  applyChecks: (value, hits) =>
    hits.size === 0
      ? { value, changed: false, fatal: false }
      : { value: { question: "" }, changed: true, fatal: false },
};

// ── 서버 턴 길의 배선(spec AC-12 · NFR-4 — 서버 턴 길과 대본 도구가 같은 함수를 부른다) ─────────────────

/**
 * 마무리 차례인가(spec 설계 3 — 마무리 물음을 꺼내는 때는 지금 그대로 앱이 정한다): 말로 답한 차례(speech)이고, 이 아이 차례를 막힘 없이 더한
 * 위치(positionAfter — 위치 되짚기 talkLessonPositionOf)가 참고 턴에 닿았거나(reachedNow) 더 이야기하기 한 바퀴가 끝났을 때(roundEndedNow)다.
 * 지금 길의 answeredPlan 과 같은 때이고, 말로 답하지 않은 차례 · 입구 차례(speech 거짓)는 위치를 읽지 않는다.
 */
export function leadClosingTurnOf({
  speech,
  positionAfter,
}: {
  speech: boolean;
  positionAfter: () => { reachedNow: boolean; roundEndedNow: boolean };
}): boolean {
  if (!speech) return false;
  const reached = positionAfter();
  return reached.reachedNow || reached.roundEndedNow;
}

/**
 * 사실 알림(status)에 실을 값(spec 설계 2 '사실 알림' 표): 아이 차례 번호(아이 말 차례만 — 입구 차례는 턴 셈 밖) · 말한 단원 단어 · 도움 수 ·
 * 앞 선생님 행의 확인된 따라 할 문장 · 소리 귀띔(말 입력 차례만) · 대화 시작(첫 차례 또는 입구 start) · 마무리 차례. rows 는 이 수업의 행
 * (대화 차례로 다시 놓는다 — leadConversationOrder), 앞 선생님 행은 그 가운데 마지막 선생님 행이다.
 */
export function leadStatusOf({
  rows,
  hasChild,
  speech,
  heard,
  turnsLeft,
  unitWords,
  homophones,
  soundAlikes,
  lemmaOf,
  open,
  closing,
}: {
  rows: readonly LeadRowLike[];
  /** 아이 말 차례인가(입구 차례면 거짓 — 'Child turn' 줄이 없다). */
  hasChild: boolean;
  /** 말 입력 차례인가(소리 귀띔을 싣는다). */
  speech: boolean;
  /** 이번 아이의 들린 글(말 입력이 아니면 빈 글). */
  heard: string;
  /** 위치 되짚기의 남은 말 턴(talkLessonPositionOf turnsLeft). */
  turnsLeft: number;
  unitWords: readonly string[];
  homophones: readonly (readonly string[])[];
  soundAlikes: readonly SoundAlikeEntry[];
  lemmaOf: (surface: string) => string | undefined;
  /** 아이 말 없이 부른 입구(없으면 null). */
  open: LeadOpen | null;
  /** 마무리 차례(leadClosingTurnOf). */
  closing: boolean;
}): TalkLeadStatus {
  const ordered = leadConversationOrder(rows);
  const prevMove = readTalkMove(
    ordered.findLast((r) => r.speaker === "tori")?.move,
  );
  const lastModel = leadLastModelOf(prevMove);
  const first = leadFirstTurnOf(ordered);
  return {
    ...(hasChild
      ? { childTurn: leadChildTurnOf({ rows: ordered, turnsLeft }) }
      : {}),
    goalWordsSaid: talkLeadGoalWordsSaidOf(
      ordered.flatMap((r) => (r.speaker === "child" && r.text ? [r.text] : [])),
      unitWords,
    ),
    help: leadHelpCountsOf(
      ordered.flatMap((r) =>
        r.speaker === "tori" ? [readTalkMove(r.move)] : [],
      ),
    ),
    ...(lastModel === undefined ? {} : { lastModelSentence: lastModel }),
    ...(speech
      ? {
          soundNotes: leadSoundNotesFor({
            heard,
            prevMove,
            unitWords,
            homophones,
            soundAlikes,
            lemmaOf,
          }),
        }
      : {}),
    ...(first || open === "start" ? { talkStarts: true } : {}),
    ...(closing ? { closingTurn: true } : {}),
  };
}

/** 아이 행의 힌트 칸(talk_turns 아이 행 hint_kind · hint_level · heard_help — 비어 있으면 none · 0 · null)을 되물은 뒤 하한의 재료로 읽는다. */
export function leadChildHelpOfRow(row: {
  hintKind?: string | null;
  hintLevel?: number | null;
  heardHelp?: string | null;
}): LeadChildHelp {
  return {
    hintKind: (row.hintKind ?? "none") as TalkHintKind,
    hintLevel: row.hintLevel ?? 0,
    heardHelp: (row.heardHelp ?? null) as Exclude<TalkHeardHelp, "none"> | null,
  };
}

/**
 * 되물은 뒤 하한을 적용하는가(02-2 259줄): 아이 말 차례이고(own 있음), 앞 선생님 행이 새 엔진의 되묻기(move.lead.move ask_again)이며, 되물은
 * 아이 차례(그 앞 마지막 아이 행)가 있을 때만 참이다.
 */
export function leadAskAgainFloorApplies({
  own,
  prevMove,
  asked,
}: {
  own: LeadChildHelp | null;
  prevMove: TalkMove | null;
  asked: LeadChildHelp | null;
}): boolean {
  return own !== null && isLeadAskAgain(prevMove) && asked !== null;
}

/**
 * 이 아이 차례의 힌트 값과 아이 행에 고쳐 쓸 칸(되물은 뒤 하한 — leadAskAgainFloorApplies 일 때 되물은 아이 차례의 힌트 칸을 하한으로 이어
 * 받는다). 하한이 값을 바꾸지 않았거나 아이 말 차례가 아니면 고쳐 쓸 칸은 비어 있다.
 */
export function leadChildHelpAfterOf(args: {
  own: LeadChildHelp | null;
  prevMove: TalkMove | null;
  asked: LeadChildHelp | null;
}): { help: LeadChildHelp | null; fields: Partial<LeadChildHelp> } {
  const { own, asked } = args;
  const help =
    own !== null && asked !== null && leadAskAgainFloorApplies(args)
      ? leadAskAgainFloorOf(own, asked)
      : own;
  const fields =
    help === null ||
    own === null ||
    (help.hintKind === own.hintKind &&
      help.hintLevel === own.hintLevel &&
      help.heardHelp === own.heardHelp)
      ? {}
      : help;
  return { help, fields };
}

/**
 * move.lead 의 gate 칸(데이터 절): 문장 문에 걸린 갈래(blocked) → 받아 둔 차례(말 칸 전체를 붙잡음 held_say · 첫 문장부터 물음을 붙잡음
 * held_question — AC-11 '판단' 행에서 따로 셈) → 힌트 단 걸림(hint_<갈래>) → 범위를 못 읽음(range_unread) 차례다.
 */
export function leadGateOf({
  blocked,
  heldSay,
  flowHeld,
  sentCount,
  hintBlock,
  rangeUnread,
}: {
  blocked: readonly string[];
  /** 흘려 받기가 말 칸 전체를 붙잡았는가(talkLeadTurn outcome.held === true). */
  heldSay: boolean;
  /** 흘려 받는 동안 문장을 붙잡았는가(createLeadSentenceFlow held()). */
  flowHeld: boolean;
  /** 흘려 받는 동안 바로 보낸 문장 수(createLeadSentenceFlow sentCount()). */
  sentCount: number;
  hintBlock: { kind: string } | null;
  rangeUnread: boolean;
}): string[] {
  return [
    ...blocked,
    ...(heldSay ? ["held_say"] : []),
    ...(!heldSay && flowHeld && sentCount === 0 ? ["held_question"] : []),
    ...(hintBlock === null ? [] : [`hint_${hintBlock.kind}`]),
    ...(rangeUnread ? ["range_unread"] : []),
  ];
}

// ── 서버 턴 길의 남은 배선 일곱(검토 rev-s1-2 N-3 · spec AC-12 — 식을 그대로 옮김, 동작은 바꾸지 않음) ─────────────────

/**
 * 흘려 받는 동안 앞 아이 차례가 막힘인가(createLeadSentenceFlow 의 prevStuck 콜백 — 앞 칸 heads 의 reading 을 받는다): 입구 차례(아이 말 없음)는
 * 거짓, '잘 모르겠어요' 단추는 말소리 없음이 아니면 참(처음부터 앎), 말은 응답의 reading 으로 정한다(leadChildStuckOf).
 */
export function leadFlowPrevStuckOf({
  hasChild,
  mode,
  nospeech,
  reading,
  heard,
  sceneWords,
  homophones,
}: {
  /** 아이 말 차례인가(입구 차례면 거짓). */
  hasChild: boolean;
  mode: "speech" | "dont_know";
  /** 말소리 없음 차례(아이 행 client_listen.src nospeech). */
  nospeech: boolean;
  /** 응답 앞 칸의 reading(heads.reading — 읽지 못했으면 undefined). */
  reading: unknown;
  heard: string;
  sceneWords: ReadonlySet<string>;
  homophones: readonly (readonly string[])[];
}): boolean {
  if (!hasChild) return false;
  if (mode === "dont_know") return !nospeech;
  return leadChildStuckOf({ reading, mode, heard, sceneWords, homophones });
}

/**
 * 응답이 없는 차례(거절 · 두 번 실패 · 설정 · 안전 상한 · 첫 문장 뒤 끊김)에 남기는 선생님 행의 kind: 마무리 차례 closing_slot, 대화 토막을 여는
 * 입구(start)는 first_question, 그 밖은 ai 다.
 */
export function leadFailedMoveKindOf({
  closing,
  open,
}: {
  closing: boolean;
  open: LeadOpen | null;
}): "closing_slot" | "first_question" | "ai" {
  return closing ? "closing_slot" : open === "start" ? "first_question" : "ai";
}

/**
 * 힌트 재료 고르기(spec 설계 3 '힌트 단추'): 범위를 읽은 차례(range 있음)에 두 칸(hint_ko · hint_en)이 다 있으면 검사(leadHintBlockOf)를 걸고,
 * 걸리지 않았으면 힌트 단 재료(leadAiHintsOf — 한 칸이 비면 undefined)를 낸다. 범위를 못 읽은 차례 · 검사에 걸린 차례는 재료가 없다(그 턴은
 * 힌트 단추 없음). output 은 응답 값 그대로 넘긴다(검사가 받는 것과 같은 값).
 */
export function leadHintsOf({
  output,
  range,
  check,
  spec,
  unitWords,
  lemmaOf,
}: {
  output: { hint_ko: string; hint_en: string };
  /** 좁은 정의 · 힌트 범위 재료(범위를 못 읽은 차례는 null). */
  range: LeadLevelInput | null;
  /** 6.4 출력 검사 값(금지어 · 단계 문장 낱말 상한). */
  check: OutputCheckOptions;
  spec: Pick<LessonHintSpec, "band" | "hintTiers">;
  unitWords: readonly string[];
  lemmaOf: (surface: string) => string | undefined;
}): { hintBlock: LeadHintBlock | null; aiHints: AiHints | undefined } {
  const bothHints =
    output.hint_ko.trim() !== "" && output.hint_en.trim() !== "";
  const hintBlock =
    range !== null && bothHints
      ? leadHintBlockOf({ output, check, range })
      : null;
  const aiHints =
    range === null || hintBlock !== null
      ? undefined
      : leadAiHintsOf({
          hintKo: output.hint_ko,
          hintEn: output.hint_en,
          spec,
          unitWords,
          lemmaOf,
        });
  return { hintBlock, aiHints };
}

/**
 * leadExtraOf 의 값: lead-record 의 LeadExtra 칸에 소리 줄 자리(soundAt — 13절 C241 보완 7)를 더한 것. leadTeacherMoveOf 가 extra 를 move.lead 에
 * 그대로 펼치므로 이 칸도 move.lead.soundAt 으로 들어간다(lead-record 의 LeadExtra 이름표에 soundAt 을 더하는 것은 요청한 변경 — 보고).
 */
export type LeadExtraWithSound = LeadExtra & Pick<TalkLead, "soundAt">;

/**
 * move.lead 의 기록 칸(데이터 절 — 좁은 정의 · 넓은 검사 수치 · gate · 마무리 상수 · 글에서 뺀 문장 · 소리 차례 바뀜). 빈 값은 칸을 두지 않고,
 * wide 는 수 값 칸만 남긴다(범위를 못 읽은 차례는 null — 칸 없음).
 */
export function leadExtraOf({
  narrow,
  wide,
  gate,
  closingAdded,
  removed,
  soundMoved,
  soundAt = {},
}: {
  narrow: LeadExtra["narrow"];
  /** 넓은 검사 수치(leadWideCheckOf — 범위를 못 읽은 차례는 null). */
  wide: Readonly<Record<string, number | undefined>> | null;
  /** leadGateOf 의 값. */
  gate: string[];
  /** leadClosingAddsOf 의 값. */
  closingAdded: boolean;
  /** leadSettleOf 의 removed. */
  removed: string[];
  /** leadSettleOf 의 soundMoved. */
  soundMoved: boolean;
  /** leadSettleOf 의 soundAt(글 사이에서 읽은 소리 줄의 자리 — 빈 값이면 칸 없음). */
  soundAt?: LowBandSoundAt;
}): LeadExtraWithSound {
  return {
    ...(narrow === undefined ? {} : { narrow }),
    ...(wide === null
      ? {}
      : {
          wide: Object.fromEntries(
            Object.entries(wide).filter(
              (e): e is [string, number] => typeof e[1] === "number",
            ),
          ),
        }),
    ...(gate.length === 0 ? {} : { gate }),
    ...(closingAdded ? { closingAdded: true as const } : {}),
    ...(removed.length === 0 ? {} : { removed }),
    ...(soundMoved ? { soundMoved: true as const } : {}),
    ...(Object.keys(soundAt).length === 0 ? {} : { soundAt: { ...soundAt } }),
  };
}

/**
 * 막힌 뒤 한국어 뜻(02-2 275줄 · C195 — 선생님 말풍선 아래 글, 읽지 않음): 아이 말 차례이고 지금 판정(koExplanationShownOf — 단추 · 막힘 말
 * 차례에서 같은 자리 막힘 수가 단계 규격 koExplainFromStuck 이상)이 보일 때만, hint_ko 를 1~3단계 거르개(leadKoLineOf)에 지난 글이다. 빈
 * 글이면 null. 서버의 lessonExplanationOf(lesson-turn.ts)와 같은 판단 · 같은 빈 글 규칙이다. stuckInSlot 은 이 아이 차례를 더한 위치 되짚기의
 * 그 자리 막힘 수를 내는 함수이고, 아이 말 차례가 아니면 부르지 않는다.
 */
export function leadExplanationOf({
  child,
  stuckInSlot,
  spec,
  level,
  hintKo,
}: {
  /** 이 아이 차례의 흐름 꼴(입구 차례면 null). */
  child: Pick<TalkLessonChildTurn, "input" | "stuck" | "nospeech"> | null;
  stuckInSlot: () => number;
  spec: Parameters<typeof koExplanationShownOf>[0]["spec"];
  level: number;
  hintKo: string;
}): string | null {
  if (child === null) return null;
  const explanation = leadKoLineOf(level, hintKo);
  if (
    !koExplanationShownOf({
      spec,
      stuckInSlot: stuckInSlot(),
      cause: childCauseOf(child),
    })
  )
    return null;
  return explanation.trim() === "" ? null : explanation;
}

/**
 * 이 아이 차례의 되묻기 표지와 '말했다'(spec 설계 4): 되묻기는 아이 말 차례에서 move 가 ask_again 일 때, '말했다'는 힌트 값(되물은 뒤 하한을
 * 적용한 값)이 있을 때 지금 판정 leadSaidWordsOf 그대로다(힌트 값이 없으면 — 입구 차례 — 빈 목록).
 */
export function leadSaidOf({
  hasChild,
  move,
  help,
  candidates,
  heard,
  speech,
  stuck,
  unitWords,
  lemmaOf,
  homophones,
}: {
  hasChild: boolean;
  move: TalkLeadMove;
  /** leadChildHelpAfterOf 의 help. */
  help: LeadChildHelp | null;
  /** 응답의 child_used_on_own. */
  candidates: readonly string[];
  heard: string;
  speech: boolean;
  stuck: boolean;
  unitWords: readonly string[];
  lemmaOf: (surface: string) => string | undefined;
  homophones: readonly (readonly string[])[];
}): { askAgain: boolean; said: string[] } {
  const askAgain = hasChild && move === "ask_again";
  const said =
    help === null
      ? []
      : leadSaidWordsOf({
          candidates,
          heard,
          hintKind: help.hintKind,
          speech,
          stuck,
          askAgain,
          unitWords,
          lemmaOf,
          homophones,
        });
  return { askAgain, said };
}

/** 아이 행에 고쳐 쓸 칸(talk_turns 아이 행 — 저장 트랜잭션이 update 로 쓴다). */
export type LeadChildFields = {
  selfUsedWords: string[];
  saidWords: string[];
  stuckPhrase: string | null;
  sentUserMessage: string;
  askAgain?: true;
} & Partial<LeadChildHelp>;

/**
 * 아이 행에 고쳐 쓸 칸: 스스로 쓴 낱말(말 입력 차례만 응답의 child_used_on_own) · '말했다' · 막힌 말(막힘이면 들린 글) · 보낸 사용자 메시지 ·
 * 되묻기 표지(있을 때만) · 되물은 뒤 하한으로 바뀐 힌트 칸. 응답이 없는 차례는 후보 · '말했다'를 빈 목록, 막힘 · 되묻기를 거짓으로 넘긴다.
 */
export function leadChildFieldsOf({
  speech,
  childUsedOnOwn,
  said,
  stuck,
  heard,
  sentUserMessage,
  askAgain,
  helpFields,
}: {
  speech: boolean;
  childUsedOnOwn: readonly string[];
  said: string[];
  stuck: boolean;
  heard: string;
  sentUserMessage: string;
  askAgain: boolean;
  /** leadChildHelpAfterOf 의 fields. */
  helpFields: Partial<LeadChildHelp>;
}): LeadChildFields {
  return {
    selfUsedWords: speech ? [...childUsedOnOwn] : [],
    saidWords: said,
    stuckPhrase: stuck ? heard : null,
    sentUserMessage,
    ...(askAgain ? { askAgain: true as const } : {}),
    ...helpFields,
  };
}

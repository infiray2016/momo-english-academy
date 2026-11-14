// 회화 이야기 방식(talk.lead_mode 'chat', intent 2026-11-13-회화-대화-구조-R spec 설계 3 · 6 · 7 · 8-2 · 9 · 10 · 11, plan 묶음 P3)의 차례 판단.
// 선생님 차례 끝 줄의 신호(기다림 시간 · 힌트 단추 · 설명 기다림 · 후보 수)와 싣지 않는 조건, 선생님이 혼자 잇달아 말한 수, 사실 줄 고르기, 앱이 아는
// 막힘('잘 모르겠어요' 단추 · C36 모름 말), quiet 행을 거른 행 목록, 안전 상한 셈, 평가 호출을 부를 차례를 정한다.
// quiet 행(input_mode quiet, 조용함 입구 차례)은 흐름 꼴(TalkLessonTurn)의 입력 방식이 아니다. 서버 · 대본 도구는 행을 흐름 꼴로 읽기 전에
// chatFlowRowsOf 로 quiet 행을 빼고, 그 목록을 참고 턴 · 인사 차례 수 · silentRun · '참여가 거의 없음'(talkLessonPositionOf · talkNearlySilent)에
// 넘긴다. 그래서 그 셈 함수(lesson-flow · ending)는 고치지 않는다. quiet 행을 세는 셈(안전 상한 · 잇달아 말한 수)은 거르지 않은 행을 받는다.
// 순수 모듈이다(DB · 서버 · SDK 없음). 설정값은 읽지 않고 인자로 받는다(설정 읽기는 lesson-turns talkChatSettingsFrom).
import type { ChatFact, ChatInput } from "@/core/conversation/chat-message";
import { isDontKnowSaying } from "@/core/conversation/child-kind";
import { leadClosingTurnOf } from "@/core/conversation/lead-turn-core";
import {
  lessonTurnSegmentOf,
  type TalkLessonPosition,
} from "@/core/conversation/lesson-flow";
import type {
  TalkChatSettings,
  TalkLessonChildTurn,
  TalkLessonSettings,
} from "@/core/conversation/lesson-turns";
import {
  TALK_SUPPORT_STAGE_EASY,
  TALK_SUPPORT_STAGE_MAX,
} from "@/core/conversation/move";

// ── 행의 최소 꼴과 quiet 행 ──────────────────────────────────────────

/** 조용함 입구 차례의 아이 행 입력 방식(talk_turns.input_mode 의 quiet, 묶음 D). */
export const CHAT_QUIET_INPUT_MODE = "quiet";

/**
 * quiet 행을 가르고 아이 행을 셀 때 읽는 행의 최소 꼴. talk_turns 행(서버 TalkTurnRow)과 대본 도구의 행이 구조로 맞는다(서버 형을 들여오지 않는다).
 * speaker 는 talk_turns.speaker 열거, inputMode 는 talk_turns.input_mode(옛 행 · 선생님 행은 null).
 */
export type ChatRowLike = {
  speaker: "child" | "tori";
  inputMode: string | null;
};

/** quiet 아이 행인가(조용함 입구가 남긴 행 — 글 없음, 입력 줄 '누르지 않음'). */
export function isChatQuietRow(row: ChatRowLike): boolean {
  return row.speaker === "child" && row.inputMode === CHAT_QUIET_INPUT_MODE;
}

/**
 * quiet 행을 거른 행 목록(spec 설계 6 저장 문단): quiet 아이 행만 빼고 나머지 행을 같은 차례 · 같은 요소로 돌려준다. 서버가 lessonTurnOf 를 부르기
 * 전에 걸러 참고 턴(말 주고받기 셈) · 인사 차례 수(greetingIndex) · silentRun(늘리지도 끊지도 않음) · 막힘 · 받침 · 바닥선 · 막힘 화면 ·
 * '잘 모르겠어요' 반짝임 · '참여가 거의 없음'의 셈에 넘긴다. quiet 행은 그 셈의 갈래 밖이라 건너뛴 것과 같다(M-4).
 */
export function chatFlowRowsOf<R extends ChatRowLike>(rows: readonly R[]): R[] {
  return rows.filter((row) => !isChatQuietRow(row));
}

/**
 * 대화 안전 상한의 아이 행 수(spec 설계 10 — 막힘 · 들리지 않음 · 조용함을 포함한 아이 차례 전부). 거르지 않은 행을 받는다. 지금 길의 셈
 * (위치 되짚기 childTurns — 아이 행 전부)에 quiet 행을 더한 수와 같다.
 */
export function chatChildTurnCountOf(rows: readonly ChatRowLike[]): number {
  return rows.filter((row) => row.speaker === "child").length;
}

/**
 * 선생님이 혼자 잇달아 말한 수(spec 설계 6 끝 문장): 마지막 quiet 아닌 아이 행 뒤의 quiet 행 수. rows 는 이 수업의 행을 대화 차례로 둔 것이다
 * (leadConversationOrder). 끝 줄을 정할 때는 이번 차례의 아이 행(quiet 차례면 그 quiet 행)까지 넣은 목록을 준다. 모름 단추 · 들리지 않음 행도
 * quiet 아닌 아이 행이라 셈을 끊는다. 입구(start · more · back)는 아이 행을 남기지 않아 셈에 닿지 않는다.
 */
export function chatTeacherRunOf(rows: readonly ChatRowLike[]): number {
  let run = 0;
  for (const row of rows) {
    if (row.speaker !== "child") continue;
    run = isChatQuietRow(row) ? run + 1 : 0;
  }
  return run;
}

// ── 앱이 아는 막힘(spec 설계 7 (마)) ───────────────────────────────────

/**
 * 이번 아이 차례가 앱이 아는 막힘인가: '잘 모르겠어요' 단추이거나, 들린 글이 모름 · 못 알아들음 말(C36 의 앱 글 대조 — 'I don't know' · 'What?'
 * 꼴, child-kind isDontKnowSaying)이다. 대화 호출이 읽기 칸을 내지 않으므로 '질문과 관계없는 한두 낱말'은 앱이 모르고 막힘이 아니다(spec 우려 13).
 * 누른 뒤 말 없음(not_heard)은 기기 쪽이라 아니고, 조용함 · 입구는 아이 입력이 아니라 아니다. 평가 호출의 reading 은 쓰지 않는다(FR-8).
 */
export function chatAppStuckOf(input: ChatInput): boolean {
  if (input.kind === "dont_know") return true;
  if (input.kind === "speech") return isDontKnowSaying(input.heard);
  return false;
}

/** 흐름 꼴 아이 행의 입력 칸(서버가 행을 저장하고 위치를 되짚을 때 쓰는 값 — 막힘은 앱이 아는 막힘). */
export type ChatChildFlow = Pick<
  TalkLessonChildTurn,
  "input" | "stuck" | "nospeech"
>;

/**
 * 이번 아이 차례의 흐름 꼴 칸: 말은 speech(막힘 말이면 stuck), 모름 단추는 dont_know, 눌렀으나 듣지 못함은 dont_know + nospeech(지금 '들리지 않음'
 * 차례와 같은 꼴). quiet 와 입구(start · more · back)는 흐름 행이 아니라 null 이다(quiet 행은 chatFlowRowsOf 가 빼는 행).
 */
export function chatChildFlowOf(input: ChatInput): ChatChildFlow | null {
  switch (input.kind) {
    case "speech":
      return { input: "speech", stuck: chatAppStuckOf(input), nospeech: false };
    case "dont_know":
      return { input: "dont_know", stuck: false, nospeech: false };
    case "not_heard":
      return { input: "dont_know", stuck: false, nospeech: true };
    default:
      return null;
  }
}

// ── 받침 단계(코드 검토 I-1) ──────────────────────────────────────────

/** 받침 첫째 · 둘째(같은 질문 자리를 잇는 선생님 행)의 단계인가 — chances isSupportMove 와 같은 범위(0 보다 크고 닫기보다 작음). */
function isSupportStage(stage: number): boolean {
  return stage > 0 && stage < TALK_SUPPORT_STAGE_MAX;
}

/**
 * 이야기 방식 선생님 행에 적을 받침 단계(move.stage). 이야기 방식 응답에는 갈래가 없어 앱이 매긴다. 서버(S1)가 이 값을 선생님 행 move.stage 에 써서
 * 위치 되짚기(talkLessonPositionOf)의 자리 잇기 · talk.dontknow_max 번째 자리 닫기 · 자리 막힘 수(stuckInSlot)가 기존 방식의 받침 행과 같은 규칙으로
 * 돌게 한다. 값의 범위와 뜻은 기존 받침 행 그대로다(0 없음 · 1 같이 말하기 · 2 쉬운 질문 · 3 닫기, move TALK_SUPPORT_STAGE_*).
 * - 앱이 아는 막힘(chatAppStuckOf): 이 아이 차례로 인사가 끝났으면(positionAfter.greetingEndNow — 막힘 말로 끝난 인사) 닫기, 자리 막힘 수가
 *   talk.dontknow_max 이상이면 닫기, 아니면 자리 막힘 수와 둘째 가운데 작은 값(지금 stuckPlan · greetingPlan · greetingEndPlan 의 규칙).
 * - quiet: 막힘이 아니어서 이어진 막힘 수를 늘리지도 끊지도 않는다(spec 설계 6 — quiet 행은 막힘 · 받침의 셈에 들지 않고 그 셈의 갈래 밖).
 *   quiet 행은 거른 목록에서 빠지지만 그 뒤 선생님 행이 받침이 아니면 새 질문 자리를 열어 자리 막힘 수가 0 이 되므로, 앞 선생님 행이 받침(1 · 2)이면
 *   그 단계를 그대로 이어 자리를 잇고, 아니면 0 이다.
 * - 막힘 아닌 말 · 눌렀으나 듣지 못함(기기 쪽 — 지금 규칙도 그 자리를 닫음) · 입구(start · more · back): 0.
 * positionAfter 는 거른 행 + 이번 아이 행(chatChildFlowOf)의 위치이고, prevStage 는 이 수업의 마지막 선생님 행의 move.stage(없으면 0)다.
 */
export function chatSupportStageOf({
  input,
  positionAfter,
  prevStage,
  settings,
}: {
  input: ChatInput;
  positionAfter: Pick<TalkLessonPosition, "stuckInSlot" | "greetingEndNow">;
  prevStage: number;
  settings: Pick<TalkLessonSettings, "dontknowMax">;
}): number {
  if (input.kind === "quiet") return isSupportStage(prevStage) ? prevStage : 0;
  if (!chatAppStuckOf(input)) return 0;
  if (
    positionAfter.greetingEndNow ||
    positionAfter.stuckInSlot >= settings.dontknowMax
  )
    return TALK_SUPPORT_STAGE_MAX;
  return Math.min(positionAfter.stuckInSlot, TALK_SUPPORT_STAGE_EASY);
}

// ── 차례 판단(인사 끝 · 마무리 차례 · 안전 상한) ──────────────────────────

/** 아이 행을 남기는 입력인가(말 · 모름 단추 · 눌렀으나 듣지 못함 · 조용함). 입구는 아이 행이 없다. */
function makesChildRow(input: ChatInput): boolean {
  return (
    input.kind === "speech" ||
    input.kind === "dont_know" ||
    input.kind === "not_heard" ||
    input.kind === "quiet"
  );
}

/**
 * 이 아이 차례로 대화 안전 상한(talk.safety_max_turns)에 닿는가(spec 설계 10 · FR-11): 이번 차례가 아이 행을 남기고(조용함 포함), 앞 아이 행 수
 * (거르지 않은 행 — chatChildTurnCountOf) + 1 이 상한 이상이다. 지금 길의 셈(lesson-turn 의 childTurns + 1 ≥ 상한)과 같은 꼴이다.
 */
export function chatLastTurnOf({
  rows,
  input,
  safetyMaxTurns,
}: {
  rows: readonly ChatRowLike[];
  input: ChatInput;
  safetyMaxTurns: number;
}): boolean {
  if (!makesChildRow(input)) return false;
  return chatChildTurnCountOf(rows) + 1 >= safetyMaxTurns;
}

/**
 * 이 아이 차례가 인사 토막의 끝 차례인가(인사 끝 사실 줄의 첫 조건, spec 설계 3 · 5): 거른 행으로 되짚은 지금 위치(position)에 이 차례의 입력을
 * 지금 규칙(lessonTurnSegmentOf — 말 · 들리지 않음 · talk.dontknow_max 번째 모름 단추)으로 맞춘다. 조용함은 인사 자리를 닫지 않고(설계 6 m-1 (다))
 * 입구는 아이 차례가 아니라 거짓이다.
 */
export function chatGreetingEndOf({
  input,
  position,
  settings,
}: {
  input: ChatInput;
  position: Parameters<typeof lessonTurnSegmentOf>[0];
  settings: Pick<TalkLessonSettings, "dontknowMax">;
}): boolean {
  const cause =
    input.kind === "speech"
      ? "speech"
      : input.kind === "dont_know"
        ? "button"
        : input.kind === "not_heard"
          ? "nospeech"
          : null;
  if (cause === null) return false;
  return lessonTurnSegmentOf(position, cause, settings) === "greeting_end";
}

/**
 * 앱의 마무리 차례인가(spec 설계 9 — 때는 지금 그대로, 참고 턴 · 한 바퀴 끝): 말로 답한 차례이고, 이 아이 차례(앱이 아는 막힘으로 매긴 흐름 행 —
 * chatChildFlowOf)를 거른 행 뒤에 더한 위치(positionAfter)가 참고 턴에 닿았거나 한 바퀴가 끝났을 때다(lead-turn-core leadClosingTurnOf 그대로).
 * 조용함 · 모름 단추 · 눌렀으나 듣지 못함 · 입구는 위치를 읽지 않고 거짓이다.
 */
export function chatClosingTurnOf({
  input,
  positionAfter,
}: {
  input: ChatInput;
  positionAfter: () => { reachedNow: boolean; roundEndedNow: boolean };
}): boolean {
  return leadClosingTurnOf({ speech: input.kind === "speech", positionAfter });
}

/**
 * 이번 차례에 붙일 사실 줄(spec 설계 3 '사실 줄은 네 때뿐이다', 글과 차례는 chat-message chatUserMessageOf).
 * - prep_next: 인사 끝 차례(greetingEnd)이고 그 뒤 짧은 준비가 열릴 때(prepOpens)만. 열리지 않으면 붙이지 않는다(I-1).
 * - ko_help: 한국어 도움 뒤의 영어 차례(koHelp 가 있을 때 — 한국어 가지가 합쳐진 뒤 부르는 쪽이 넘긴다).
 * - closing: 앱의 마무리 차례(chatClosingTurnOf).
 * - last_turn: 안전 상한 차례(chatLastTurnOf). 이 차례 뒤 앱이 대화를 닫으므로 두 단추(closing) · 짧은 준비(prep_next)의 사실 줄은 붙이지 않는다
 *   (사실 줄은 앱이 하는 일을 알리는 사실이라 하지 않을 일을 알리지 않는다).
 */
export function chatFactsOf({
  greetingEnd,
  prepOpens,
  closing,
  lastTurn,
  koHelp,
}: {
  greetingEnd: boolean;
  prepOpens: boolean;
  closing: boolean;
  lastTurn: boolean;
  koHelp?: { taught: string | null } | null;
}): ChatFact[] {
  const facts: ChatFact[] = [];
  if (greetingEnd && prepOpens && !lastTurn) facts.push({ kind: "prep_next" });
  if (koHelp) facts.push({ kind: "ko_help", taught: koHelp.taught });
  if (closing && !lastTurn) facts.push({ kind: "closing" });
  if (lastTurn) facts.push({ kind: "last_turn" });
  return facts;
}

/**
 * 선생님 차례가 끝난 뒤의 갈래(spec 설계 9 · 10): last_turn 안전 상한 차례(말 뒤 앱이 닫음) · closing 앱의 마무리 차례(두 단추) · suggestion 선생님이
 * 스스로 맺음(wrap_up 참 → 마무리 제안, 두 단추) · null 보통 차례. 앞선 차례: 안전 상한 → 마무리 차례(wrap_up 이 함께 참이어도) → wrap_up.
 */
export type ChatTurnEnd = "closing" | "suggestion" | "last_turn" | null;

/**
 * 차례 끝 갈래. wrapUp 은 응답 처리(묶음 P2)를 지난 값이다 — 인사 토막 · 수업 첫 말 · 돌아옴 차례의 wrap_up 참을 거짓으로 다루는 일은 P2 가 한다.
 */
export function chatTurnEndOf({
  closing,
  lastTurn,
  wrapUp,
}: {
  closing: boolean;
  lastTurn: boolean;
  wrapUp: boolean;
}): ChatTurnEnd {
  if (lastTurn) return "last_turn";
  if (closing) return "closing";
  return wrapUp ? "suggestion" : null;
}

/**
 * 서버가 조용함 입구(quiet)를 받는가(spec 설계 6 — 화면 신호와 이중으로 지킴): talk.chat_quiet_seconds 가 0 보다 크고, 고르기 차례(두 단추 —
 * 위치 되짚기 choice)가 아니며, 선생님이 혼자 잇달아 말한 수(거르지 않은 행 — 이번 quiet 앞까지)가 talk.chat_teacher_run_max 보다 적을 때다.
 * 겹친 요청 막기(표지 행)는 턴 길(묶음 S1)의 몫이다.
 */
export function chatQuietAcceptsOf({
  rows,
  choice,
  settings,
}: {
  rows: readonly ChatRowLike[];
  choice: "closing" | "suggestion" | null;
  settings: Pick<TalkChatSettings, "quietSeconds" | "teacherRunMax">;
}): boolean {
  if (settings.quietSeconds <= 0 || choice !== null) return false;
  return chatTeacherRunOf(rows) < settings.teacherRunMax;
}

// ── 끝 줄 신호(화면 W · 턴 길 S1 이 함께 쓰는 약속) ─────────────────────

/**
 * 이야기 방식 선생님 차례 끝 줄의 신호. 화면은 방식을 읽지 않고 이 칸만 따른다(spec 설계 6 첫 문단). 싣지 않는 칸은 칸 자체가 없다(undefined 를
 * 싣지 않음).
 * - quietSeconds: 조용함 기다림 시간(초, talk.chat_quiet_seconds). 싣지 않는 때: 차례 끝이 closing · suggestion · last_turn · 잇달아 말한 수가
 *   talk.chat_teacher_run_max 이상 · 'AI 쉬는 중' · 값이 0. 칸이 없으면 화면은 조용함 입구를 보내지 않는다.
 * - hint: 힌트 단추 표지(참일 때만 칸이 있음). 싣지 않는 때: closing · suggestion · last_turn. 단 수 · 단의 종류 · 글은 싣지 않는다(설계 7, I-4).
 * - explainWait: '설명 기다림' — 설명을 기다리는 상한(초, talk.chat_explain_wait_seconds). 칸이 있으면(값이 0 이어도) 화면은 끝 줄 뒤 힌트 받는
 *   서버 액션으로 설명을 청하고, 조용함 타이머는 '설명이 보인 때 · 설명 실패 · 이 상한 가운데 가장 이른 때'와 읽기 끝 가운데 늦은 때부터 잰다
 *   (설계 6 · 7). 값 0 은 '청하되 타이머는 기다리지 않음'이므로 화면은 참거짓이 아니라 칸이 있는지로 읽는다. 싣는 때: 바로 앞 아이 차례가 앱이 아는
 *   막힘(설계 7 '막힌 뒤 한국어 설명' — 마무리 차례 · 마무리 제안에도 싣는다). 싣지 않는 때: 안전 상한 차례(설명이 보일 아이 차례가 없음) ·
 *   'AI 쉬는 중'(설명 호출이 성공할 수 없음) · 다음이 짧은 준비인 차례(컨트롤러가 정한 것, 검토 M1 · M2 · M4).
 * - alternatives: 인식 후보 수(talk.chat_alternatives). 다음 아이 차례가 말 차례일 때만 싣는다(싣지 않는 때: closing · suggestion · last_turn).
 *   칸이 없으면 화면은 maxAlternatives 를 지금처럼 1 로 둔다(설계 11).
 * 다음이 짧은 준비인 차례(인사 끝 뒤 준비가 열림)는 그 뒤에 이야기 방식 아이 차례가 없으므로 네 칸 모두 싣지 않는다(빈 신호, 검토 M2).
 */
export type ChatEndSignal = {
  quietSeconds?: number;
  hint?: true;
  explainWait?: number;
  alternatives?: number;
};

/**
 * 끝 줄 신호. end 는 chatTurnEndOf, run 은 이번 차례의 아이 행까지 넣은 행의 잇달아 말한 수(chatTeacherRunOf), input 은 이 선생님 차례를 연 입력
 * (설명 기다림은 그 입력이 앱이 아는 막힘인지로 정함), aiResting 은 이 차례가 'AI 쉬는 중'(첫 말 실패 뒤 카드 인사 첫 줄 · 안전 상한의 카드
 * 끝인사 등)으로 끝났는지, prepNext 는 이 차례 뒤 짧은 준비가 열리는지(인사 끝 사실 줄을 붙인 차례와 같은 조건 — 인사 끝이고 준비가 열림)다.
 */
export function chatEndSignalOf({
  end,
  run,
  aiResting,
  prepNext,
  input,
  settings,
}: {
  end: ChatTurnEnd;
  run: number;
  aiResting: boolean;
  prepNext: boolean;
  input: ChatInput;
  settings: Pick<
    TalkChatSettings,
    "quietSeconds" | "teacherRunMax" | "alternatives" | "explainWaitSeconds"
  >;
}): ChatEndSignal {
  if (prepNext) return {};
  const childSpeaks = end === null;
  const explains = end !== "last_turn" && !aiResting && chatAppStuckOf(input);
  const waits =
    childSpeaks &&
    !aiResting &&
    run < settings.teacherRunMax &&
    settings.quietSeconds > 0;
  return {
    ...(waits ? { quietSeconds: settings.quietSeconds } : {}),
    ...(childSpeaks ? { hint: true as const } : {}),
    ...(explains ? { explainWait: settings.explainWaitSeconds } : {}),
    ...(childSpeaks ? { alternatives: settings.alternatives } : {}),
  };
}

// ── 평가 호출을 부를 차례(spec 설계 8-2) ──────────────────────────────

/**
 * 이 아이 차례가 평가 호출을 부를 차례인가: 말 입력(speech)이고 들린 글이 있다. 조용함 · '잘 모르겠어요' · '눌렀으나 듣지 못함' · 입구 차례는
 * 부르지 않는다(chat_judge 상태 '부르지 않음'). 모름 말을 말로 한 차례도 말 입력이라 부른다(설계 8-2 '입력 방식 speech 이고 들린 글이 있는 차례').
 */
export function chatEvalDueOf(input: ChatInput): boolean {
  return input.kind === "speech" && input.heard.trim() !== "";
}

/** 평가 호출을 읽을 때 쓰는 행의 최소 꼴(ChatRowLike + 아이 행의 들린 글). */
export type ChatEvalRowLike = ChatRowLike & { text: string | null };

/** 저장된 아이 행이 평가 호출을 부를 행인가(chatEvalDueOf 의 행 꼴: 말 입력 — 옛 행의 빈 입력 방식은 말 — 이고 글이 있음). */
function evalRowDue(row: ChatEvalRowLike): boolean {
  if (row.speaker !== "child") return false;
  if (row.inputMode !== null && row.inputMode !== "speech") return false;
  return (row.text ?? "").trim() !== "";
}

/**
 * 선생님 차례 n+1 이 저장된 뒤 평가할 아이 차례 n: rows(대화 차례)의 마지막 행이 선생님 행이고 바로 앞 행이 평가할 아이 행이면 그 행, 아니면 null.
 * 되묻기가 n+1 의 일이라 n 의 판정은 n+1 뒤에 부른다(설계 8-2). 입구로 연 선생님 차례(앞이 선생님 행) · quiet 차례 뒤는 null 이다.
 */
export function chatEvalAfterTeacherOf<R extends ChatEvalRowLike>(
  rows: readonly R[],
): R | null {
  const last = rows.at(-1);
  const prev = rows.at(-2);
  if (last?.speaker !== "tori" || prev === undefined) return null;
  return evalRowDue(prev) ? prev : null;
}

/**
 * 수업이 닫힐 때 평가할 아이 행: 평가할 아이 행 가운데 아직 판정을 기다리는 행(waiting — chat_judge 상태를 읽는 쪽이 넘김) 전부. 마지막 아이 차례는
 * n+1 없이 한 번 부른다(되묻기 없음으로 봄, 설계 8-2 끝 문장). 차례는 rows 그대로다.
 */
export function chatEvalOnCloseOf<R extends ChatEvalRowLike>(
  rows: readonly R[],
  waiting: (row: R) => boolean,
): R[] {
  return rows.filter((row) => evalRowDue(row) && waiting(row));
}

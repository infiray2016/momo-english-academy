// 회화 수업 새 흐름(C189 새 꼴 카드, 회화 plan 묶음 5): 위치 되짚기(talkLessonPositionOf)와 다음 선생님 차례 계획(nextTeacherTurnOf).
// 3.3 네 토막 · 대화 토막 차례 표(대화 첫 질문 · AI 차례 · 카드 자리 · 마무리 자리) · 막힘 문단(받침 셋 · 질문 자리 · 이어진 막힘) ·
// 기기 쪽(들리지 않음) · 따라가기 상한 · 같은 질문 되풀이 막기 · 짧은 준비 (나) · 수업 끝(마무리 물음 · 마무리 제안)을 talk_turns 의
// 가벼운 꼴(아이 행 · 선생님 행 move)로 되짚는다. 카드 기회를 채우려는 카드 자리는 없다(C172). 첫 프리뷰는 이어진 막힘을 세기만 하고
// 바닥선으로 가지 않는다(정한 것 17, 바닥선 · 1단계 첫 꼴 · 4단계 AI 쉬운 질문 받침 · 5단계 미션은 둘째 묶음).
// 순수 모듈이다(시각 · DB · 무작위 없음). 숫자는 설정 · 단계 규격에서 받는다.
import {
  cardItemOf,
  isSupportMove,
  oldestMoreOf,
  slotChanceOf,
  stuckPrepWordsOf,
  type TalkCarry,
  type TalkChances,
  talkChancesOf,
} from "@/core/conversation/chances";
import {
  childCauseOf,
  isLowBand,
  type TalkLessonCard,
  type TalkLessonChildTurn,
  type TalkLessonItem,
  type TalkLessonSettings,
  type TalkLessonSpec,
  type TalkLessonTeacherTurn,
  type TalkLessonTurn,
  type TalkTurnSegment,
} from "@/core/conversation/lesson-turns";
import {
  NO_CARD_ITEM,
  TALK_SUPPORT_STAGE_EASY,
  TALK_SUPPORT_STAGE_MAX,
  TALK_SUPPORT_STAGE_TOGETHER,
  type TalkAppHelp,
  type TalkCardItemRef,
  type TalkChildCause,
  type TalkMove,
  type TalkMoveInput,
  type TalkMoveKind,
  type TalkSlotWhy,
  talkMoveOf,
} from "@/core/conversation/move";
import {
  questionKeyOf,
  turnQuestionOf,
} from "@/core/conversation/question-check";
import { MORE_PROMPT } from "@/core/conversation/spoken";
import type {
  TALK_NEXT_MOVES,
  TALK_SEGMENTS,
  TALK_SUPPORTS,
} from "@/core/seed/structure";

/** 대화 중 연 짧은 준비가 끝나고 대화로 돌아갈 때의 앱 대사(3.3 짧은 준비 (나)). */
export const NOW_LETS_TALK = "Now let's talk.";

/** 받침 단계(3.3 막힘 표의 줄): 같이 말하기 · 쉬운 질문 · 닫기(talk.dontknow_max 번째). */
const STAGE_TOGETHER = TALK_SUPPORT_STAGE_TOGETHER;
const STAGE_EASY = TALK_SUPPORT_STAGE_EASY;
const STAGE_CLOSE = TALK_SUPPORT_STAGE_MAX;

type TalkSegment = (typeof TALK_SEGMENTS)[number];
type TalkNextMove = (typeof TALK_NEXT_MOVES)[number];
type TalkSupport = (typeof TALK_SUPPORTS)[number];

export type LessonArgs = {
  spec: TalkLessonSpec;
  card: TalkLessonCard;
  /** 이번 수업 새 단어(수업 newWords). */
  newWords: readonly string[];
  turns: readonly TalkLessonTurn[];
  /** 지금 토막(sessions.talk_segment). */
  segment: TalkSegment;
  settings: TalkLessonSettings;
  /** 이월(세션 시작 스냅숏, 둘째 묶음 — 없으면 빈 목록). */
  carry?: TalkCarry;
  /** 해낸 미션 수(5~7단계). */
  missionsDone?: number;
  /**
   * 인사 뒤 준비 토막을 실제로 지났을 때 쪽지로 보인 낱말 전부(인식 실패로 건너뛴 낱말 포함, 정본 02-2 175줄). 1~3단계 늘 ·
   * 4단계부터 앞 수업 바닥선 (가)로 연 준비다. 부르는 쪽이 talk-prep 시도로 안다(talk-start 스냅숏의 준비 목록이 아님). 비었으면
   * 인사 뒤 준비를 하지 않은 것이다(필수 칸 — 빠뜨리면 형 검사가 잡는다). 대화 중 연 준비는 move.prep 으로 스스로 안다.
   * 낱말 수 설정 talk.prep_words(settings.prepWords)와 다른 칸이다.
   */
  prepWords: readonly string[];
};

// ── 위치 되짚기 ─────────────────────────────────────────────────

/** 질문 자리: 한 질문과, 막힌 뒤 그 질문 대신 준 도움 · 바꾼 질문이 이어지는 동안(3.3 말 표). */
export type TalkQuestionSlot = {
  /** 마지막으로 보인 질문 글(받침 둘째의 쉬운 질문이면 그 글). 질문이 없으면 null. */
  question: string | null;
  /** 이 자리에서 보인 질문 글 모두(차례마다 그 차례의 질문 — 같은 질문 막기 재료). */
  questions: string[];
  item: TalkCardItemRef;
  words: string[];
  goals: string[];
  /** 이 자리의 답(카드 항목 · 인사 질문 · AI 질문의 답 예시). 없으면 null. */
  answerExample: string | null;
  /** 받침 둘째에 쓸 카드 쉬운 질문(카드 항목일 때만). */
  easyQuestion: { en: string; ko?: string } | null;
};

export type TalkLessonPosition = {
  segment: TalkSegment;
  phase: "greeting" | "talk";
  /** 인사 질문 차례(0부터) · 인사를 다 했다 · 지금 질문이 마지막 인사 질문이다. */
  greetingIndex: number;
  greetingDone: boolean;
  lastGreetingQuestion: boolean;
  /** 마지막 아이 행이 마지막 인사 질문 자리를 끝낸 '인사 끝' 턴이다(greetingEndsOf — 저장된 행의 토막은 greeting 이라 행 토막으로는 모른다). */
  greetingEndNow: boolean;
  /** 지금 열린 질문 자리(닫혔으면 null). */
  slot: TalkQuestionSlot | null;
  /** 마지막 아이 행이 답하던 질문 자리(그 행으로 닫혔어도 남음 — 받침 줄 · 막힌 질문 재료). */
  answeredSlot: TalkQuestionSlot | null;
  /** 지금 질문 자리의 이어진 막힘 수. */
  stuckInSlot: number;
  /** 질문 자리와 관계없이 이어진 아이 쪽 막힘(들리지 않음은 늘리지도 끊지도 않음). */
  streak: number;
  /** 이어진 막힘이 바닥선 문턱(talk.floor_after_stuck)에 닿았다. 첫 프리뷰는 세기만 한다. */
  floorDue: boolean;
  /** 들리지 않음으로 닫힌 자리가 이어진 수 · speech.silent_items_max 에 닿았다(7절 막힘 화면, C22). */
  silentRun: number;
  silentBlocked: boolean;
  /** 마지막 아이 차례가 들리지 않음이다 — 다음 아이 차례에 '잘 모르겠어요' 단추를 문구 없이 한 번 반짝인다. */
  flashDontKnow: boolean;
  /** 마지막 아이 차례의 까닭(말로 답했으면 null). */
  lastCause: TalkChildCause | null;
  /** 마지막 행이 누구인가(행이 없으면 null). */
  lastRow: "child" | "teacher" | null;
  /** '말 주고받기 n'(인사 · 대화 토막의 말 · 막힘 아님 · 한국어 질문 아님). */
  talkCount: number;
  /** '더 이야기하기'의 말 턴 수 · 몇 번째 · 이번 회의 턴 수. */
  moreCount: number;
  moreRound: number;
  moreInRound: number;
  /** 마무리 물음까지 남은 수(참고, 채울 몫이 아님 — 사용자 메시지 'Turns left before closing question'). */
  turnsLeft: number;
  /** 아이 턴 수(막힘 포함 — 대화 안전 상한). */
  childTurns: number;
  /** 따라가기 갈래가 끝에서 이어진 선생님 차례 수. */
  followRun: number;
  /**
   * 마지막 이어 묻기(갈래 follow_up · follow_child) 뒤 선생님 차례 수(대화 토막의 AI 차례 · 카드 자리 · 대화 첫 질문 — 받침 차례 · 인사 끝 반응 ·
   * 마무리 자리는 세지 않음. 이어 묻기 하한이 선생님 차례로 세는 것과 같다, 02-2 184줄 · 검토 rev-night-2 M-5). 사용자 메시지
   * 'Teacher turns since last follow-up'(13절 C202 (2) · 분석 5.2 2).
   */
  teacherTurnsSinceFollowUp: number;
  /** 마지막 아이 행이 카드 기회(카드 항목 · 단원 단어를 노린 질문 자리)에 말로 답했다(사용자 메시지 'Previous turn was a card chance'). */
  afterCardChance: boolean;
  /**
   * 마지막 아이 행 바로 앞 선생님 행이 앱이 붙인 대화 첫 질문(대화 토막의 first_question — AI 를 부르지 않아 앞 턴 전문에 없음)이면 그 질문 글과
   * 카드 기회 여부, 아니면 null(사용자 메시지 'App question just before', task-talk-13-report 9절 2).
   */
  appAskedBefore: { en: string; card: boolean } | null;
  /** 고르기 차례: 마무리 물음('더 이야기하기' · '그만하기') · 마무리 제안(같은 두 버튼, 말로 답해도 됨). */
  choice: "closing" | "suggestion" | null;
  /** 마무리 물음이 나왔다 · 아이가 답했다(참여 완료 (1)). */
  closingAsked: boolean;
  closingAnswered: boolean;
  /** 이 수업에서 짧은 준비를 했다 · 대화 중 연 준비가 아직 대화로 돌아가지 않았다. */
  prepOpened: boolean;
  prepPending: boolean;
  /** 대화 첫 질문 차례(인사 끝 반응 뒤 · 대화 중 연 준비 뒤 — 앱이 필수 질문을 보이고 읽는다). */
  firstQuestionDue: boolean;
  /** 대화 닫힘(정리 토막). */
  closed: boolean;
  /** 이 대화에서 나온 선생님 질문 글의 수(questionKeyOf 꼴, 차례마다 그 차례의 질문 하나 — turnQuestionOf, 마무리 물음 뺌). */
  askedQuestions: Map<string, number>;
  /** 마지막 아이 행으로 말 주고받기가 참고 턴에 닿았다 · '더 이야기하기' 한 번이 끝났다(마무리 자리). */
  reachedNow: boolean;
  roundEndedNow: boolean;
};

type Ctx = Pick<LessonArgs, "spec" | "card" | "settings">;

/** 이어 묻기 갈래(아이 말에 이어 묻기 · 아이가 꺼낸 이야기 따라가기 — 02-2 184줄 '아이 말에 이어 묻는 질문'). */
const FOLLOW_UP_MOVES: ReadonlySet<TalkNextMove> = new Set([
  "follow_up",
  "follow_child",
]);
/** 이어 묻기 뒤 셈에 드는 선생님 차례 종류(AI 차례 · 카드 자리 · 대화 첫 질문). */
const COUNTED_TURNS: ReadonlySet<TalkMoveKind> = new Set([
  "ai",
  "card_slot",
  "first_question",
]);

function greetingAnswerOf(ctx: Ctx, index: number): string | null {
  const g = ctx.card.greeting;
  if (!("questions" in g)) return null;
  const a = g.questions[index]?.answerExample;
  return a === undefined || a === "" ? null : a;
}

function slotOf(
  ctx: Ctx,
  row: TalkLessonTeacherTurn,
  questions: string[],
  greetingIndex: number | null,
): TalkQuestionSlot {
  const m = row.move;
  const item = m ? { ...m.item } : { ...NO_CARD_ITEM };
  const cardItem = cardItemOf(ctx.card, item);
  const answer =
    cardItem?.answerExample ??
    (greetingIndex === null ? null : greetingAnswerOf(ctx, greetingIndex)) ??
    row.answerExample ??
    null;
  return {
    question: questions.at(-1) ?? null,
    questions: [...questions],
    item,
    words: [...(m && m.words.length > 0 ? m.words : (cardItem?.targets ?? []))],
    goals: [...(m && m.goals.length > 0 ? m.goals : (cardItem?.goals ?? []))],
    answerExample: answer === "" ? null : answer,
    easyQuestion: cardItem ? { ...cardItem.easyQuestion } : null,
  };
}

/** 아이 턴의 입력(lessonTurnSegmentOf 의 cause 꼴 — 말 · 단추 · 들리지 않음). */
function inputCauseOf(
  row: Pick<TalkLessonChildTurn, "input" | "nospeech">,
): "speech" | "button" | "nospeech" {
  if (row.input === "speech") return "speech";
  return row.nospeech ? "nospeech" : "button";
}

/**
 * 이 아이 턴이 마지막 인사 질문 자리를 끝내는가('인사 끝', C19): 말 입력 · 들리지 않음 · talk.dontknow_max 번째 단추. 말 입력은 응답의
 * 막힘 판단 전에 정하므로 막힘 말이어도 끝낸 것으로 본다. 계획(lessonTurnSegmentOf)과 되짚기(talkLessonPositionOf)가 이 규칙 하나를 쓴다 —
 * talk_turns.segment 열거에 greeting_end 가 없어 저장된 행은 토막 greeting 으로 남기 때문이다(fix 1 I-A).
 */
function greetingEndsOf(
  lastGreetingQuestion: boolean,
  stuckInSlot: number,
  cause: "speech" | "button" | "nospeech",
  settings: Pick<TalkLessonSettings, "dontknowMax">,
): boolean {
  if (!lastGreetingQuestion) return false;
  return cause !== "button" || stuckInSlot + 1 >= settings.dontknowMax;
}

/**
 * 지금 자리(3.3). 행을 차례로 되짚는다. 선생님 행: 받침 첫째 · 둘째(move.stage 1 · 2)는 지금 질문 자리를 잇고, 그 밖은 그 행의 질문으로
 * 새 자리를 연다(마무리 자리는 고르기 차례). 아이 행: 말로 답함 → 자리 닫힘 · 말 주고받기 +1 · 이어진 막힘 0, 단추 · 막힘 말 → 자리의
 * 막힘 +1 · 이어진 막힘 +1(talk.dontknow_max 번째면 자리 닫힘), 들리지 않음 → 자리 닫힘(받침 단계 · 이어진 막힘 그대로). 고르기 차례에
 * 아이 행 없이 선생님 행이 오면 '더 이야기하기'를 고른 것이다.
 */
export function talkLessonPositionOf(args: LessonArgs): TalkLessonPosition {
  const { spec, card, settings, turns, segment } = args;
  const ctx: Ctx = { spec, card, settings };
  let phase: "greeting" | "talk" = "greeting";
  let greetingIndex = 0;
  let slot: TalkQuestionSlot | null = null;
  let answeredSlot: TalkQuestionSlot | null = null;
  let stuckInSlot = 0;
  let streak = 0;
  let silentRun = 0;
  let lastCause: TalkChildCause | null = null;
  let flash = false;
  let lastRow: "child" | "teacher" | null = null;
  let talkCount = 0;
  let moreCount = 0;
  let childTurns = 0;
  let followRun = 0;
  let sinceFollowUp = 0;
  let appAsked: { en: string; card: boolean } | null = null;
  let choice: "closing" | "suggestion" | null = null;
  let closingAsked = false;
  let closingAnswered = false;
  let prepOpened = args.prepWords.length > 0;
  let prepPending = false;
  let talkFirstAsked = false;
  let transitionNext = false;
  let reachedNow = false;
  let roundEndedNow = false;
  let greetingEndNow = false;
  const asked = new Map<string, number>();

  const endChoice = () => {
    if (choice === "closing") closingAnswered = true;
    choice = null;
  };

  for (const row of turns) {
    reachedNow = false;
    roundEndedNow = false;
    greetingEndNow = false;
    if (row.speaker === "teacher") {
      lastRow = "teacher";
      endChoice();
      const m = row.move;
      // 셈은 그 차례의 질문 하나다(반응 부분의 물음 'Really?' 는 들지 않음, 02-2 200 · 202줄)
      const question = turnQuestionOf(row.text, m?.kind ?? null);
      const questions = question === null ? [] : [question];
      // 앱이 붙인 대화 첫 질문(앞에 아이 행이 없어 앞 턴 전문에 들지 않는다 — 다음 회화 턴 사용자 메시지로 알린다)
      appAsked =
        phase === "talk" && !transitionNext && m?.kind === "first_question"
          ? {
              en: question ?? row.text,
              card: m.item.kind !== "none" || m.words.length > 0,
            }
          : null;
      if (question !== null) {
        const key = questionKeyOf(question);
        asked.set(key, (asked.get(key) ?? 0) + 1);
      }
      if (m?.prep) {
        prepOpened = true;
        prepPending = true;
      } else if (prepPending && m?.kind === "first_question") {
        // 준비가 끝나 대화로 돌아왔다 — 이어진 막힌 차례 셈을 0 으로(3.3 짧은 준비 (나))
        prepPending = false;
        streak = 0;
      }
      if (m && !isSupportMove(m))
        followRun = m.next === "follow_child" ? followRun + 1 : 0;
      if (transitionNext) {
        // 인사 끝 턴의 응답은 반응과 넘어가는 말뿐이다(질문 자리를 열지 않음, C19)
        transitionNext = false;
        slot = null;
        continue;
      }
      // 이어 묻기 뒤 선생님 차례 셈(대화 토막 — 받침 차례는 막힘 처리라, 마무리 자리는 마무리 물음이라 세지 않는다)
      if (
        phase === "talk" &&
        m &&
        COUNTED_TURNS.has(m.kind) &&
        !isSupportMove(m)
      )
        // 카드 항목을 쓴 차례는 갈래가 이어 묻기여도 이어 묻기로 세지 않는다(카드 답 뒤 되돌린 필수 질문 — 검토 rev-prompt-2 E)
        sinceFollowUp =
          m.kind === "ai" &&
          FOLLOW_UP_MOVES.has(m.next) &&
          m.item.kind === "none"
            ? 0
            : sinceFollowUp + 1;
      if (phase === "talk" && m?.kind === "first_question")
        talkFirstAsked = true;
      if (m?.kind === "closing_slot") {
        choice = "closing";
        closingAsked = true;
        slot = null;
      } else if (m && isSupportMove(m) && slot) {
        slot.questions.push(...questions);
        if (questions.length > 0) slot.question = questions.at(-1) ?? null;
      } else {
        const opens =
          questions.length > 0 || (m?.item.kind ?? "none") !== "none";
        slot = opens
          ? slotOf(
              ctx,
              row,
              questions,
              phase === "greeting" ? greetingIndex : null,
            )
          : null;
        stuckInSlot = 0;
      }
      if (m?.next === "closing" && m.kind !== "closing_slot")
        choice = "suggestion";
      continue;
    }
    lastRow = "child";
    childTurns += 1;
    // 한국어 질문 턴(변경 단위 ⑤)은 고르기 · 질문 자리 · 셈을 바꾸지 않는다
    if (row.koQuestion) continue;
    endChoice();
    const cause = childCauseOf(row);
    lastCause = cause;
    flash = cause === "nospeech";
    answeredSlot = slot;
    // 셈을 바꾸기 전 자리로 판단한다(계획 때 lessonTurnSegmentOf 가 본 값과 같다)
    const endsGreeting =
      phase === "greeting" &&
      (row.segment === "greeting_end" ||
        greetingEndsOf(
          greetingIndex === card.greetingTurns - 1,
          stuckInSlot,
          inputCauseOf(row),
          settings,
        ));
    let slotEnded = false;
    if (cause === "nospeech") {
      silentRun += 1;
      slotEnded = true;
    } else if (cause !== null) {
      silentRun = 0;
      stuckInSlot += 1;
      streak += 1;
      slotEnded = stuckInSlot >= settings.dontknowMax;
    } else {
      silentRun = 0;
      stuckInSlot = 0;
      streak = 0;
      slotEnded = true;
      if (row.segment === "more_talk") {
        moreCount += 1;
        roundEndedNow = moreCount % settings.moreRoundTurns === 0;
      } else {
        talkCount += 1;
        // 참고 턴에 닿은 뒤 마무리 자리가 아직 나오지 않았으면(실패 길 등) 다음 말 턴이 마무리 자리다(늦추지 않음, 02-2 296줄)
        reachedNow = talkCount >= spec.targetTurns && !closingAsked;
      }
    }
    if (slotEnded || endsGreeting) slot = null;
    if (endsGreeting) {
      // 인사 끝 턴(막힘 말이어도 — 그 응답은 답을 한 번 들려주고 닫는다, greetingEndPlan): 다음 선생님 행은 반응 · 넘어가는 말뿐이다
      phase = "talk";
      transitionNext = true;
      greetingEndNow = true;
    } else if (phase === "greeting") {
      if (slotEnded) greetingIndex += 1;
      if (greetingIndex >= card.greetingTurns) phase = "talk";
    }
  }

  const closed = segment === "wrap_up";
  const round = settings.moreRoundTurns;
  const inRound = moreCount % round;
  const roundEnded = choice === "closing" && moreCount > 0 && inRound === 0;
  const moreRound =
    segment !== "more_talk" && !roundEnded
      ? 0
      : roundEnded
        ? moreCount / round
        : Math.floor(moreCount / round) + 1;
  const turnsLeft =
    segment === "more_talk"
      ? choice === null
        ? round - inRound
        : 0
      : Math.max(0, spec.targetTurns - talkCount);
  return {
    segment,
    phase,
    greetingIndex: phase === "talk" ? card.greetingTurns : greetingIndex,
    greetingDone: phase === "talk",
    lastGreetingQuestion:
      phase === "greeting" && greetingIndex === card.greetingTurns - 1,
    greetingEndNow,
    slot,
    answeredSlot,
    stuckInSlot,
    streak,
    floorDue: streak >= settings.floorAfterStuck,
    silentRun,
    silentBlocked: silentRun >= settings.silentItemsMax,
    flashDontKnow: flash,
    lastCause,
    lastRow,
    talkCount,
    moreCount,
    moreRound,
    moreInRound: roundEnded ? round : inRound,
    turnsLeft,
    childTurns,
    followRun,
    teacherTurnsSinceFollowUp: sinceFollowUp,
    afterCardChance:
      lastRow === "child" &&
      lastCause === null &&
      answeredSlot !== null &&
      (answeredSlot.item.kind !== "none" || answeredSlot.words.length > 0),
    appAskedBefore: lastRow === "child" ? appAsked : null,
    choice,
    closingAsked,
    closingAnswered,
    prepOpened,
    prepPending,
    firstQuestionDue:
      !closed &&
      phase === "talk" &&
      lastRow === "teacher" &&
      slot === null &&
      choice === null &&
      (!talkFirstAsked || prepPending),
    closed,
    askedQuestions: asked,
    reachedNow,
    roundEndedNow,
  };
}

/** 늦은 카드 답으로 보는 폭: 필수 질문 차례 뒤 이번 말 앞까지의 아이 차례 수 상한(대본 4회차 사례 둘 — 한두 턴 늦은 답, 판정 폭이라 설계 숫자가 아님). */
export const LATE_CARD_ANSWER_MAX_GAP = 2;

/** 늦은 카드 답 판정이 읽는 대화 행(선생님 행은 move 로 필수 질문을 알고, 아이 행은 인식 글로 노린 단어를 본다). */
export type LateCardRow = {
  speaker: "teacher" | "child";
  text: string;
  move?: Pick<TalkMove, "item" | "words"> | null;
};

/**
 * 한두 턴 늦게 온 카드 답(대본 4회차 설계 재판정 N-2 (a) · 검토 rev-prompt-2 P3-3): 가장 최근 필수 질문 차례(move.item required)의 노린 단원 단어를
 * 아이의 이번 말이 처음으로 담았으면 참(소문자 · 원형). 그 뒤 아이 말 가운데 이미 노린 단어를 담은 것이 있으면(이미 답함) 거짓이고, 그 질문 뒤
 * 아이 차례가 LATE_CARD_ANSWER_MAX_GAP 를 넘게 지났으면(그 주제로 계속 말하는 중) 거짓이다. 참이면 '앞 차례가 카드 기회'로 보아 그 답에 먼저
 * 이어 묻게 한다(C204 (6) · C202 (2)).
 */
export function lateCardAnswerOf({
  rows: given,
  turns,
  child,
  lemmaOf,
}: {
  rows?: readonly LateCardRow[];
  /** 옛 입력(흐름 꼴 — 아이 행 글이 없어 '이미 답함'은 보지 못하고 폭만 본다). rows 가 있으면 rows 를 쓴다. */
  turns?: readonly TalkLessonTurn[];
  child: string;
  lemmaOf: (surface: string) => string | undefined;
}): boolean {
  const rows: readonly LateCardRow[] =
    given ??
    (turns ?? []).map((row) =>
      row.speaker === "teacher"
        ? { speaker: "teacher", text: row.text, move: row.move }
        : { speaker: "child", text: "" },
    );
  const at = rows.findLastIndex(
    (row) => row.speaker === "teacher" && row.move?.item.kind === "required",
  );
  const targets = new Set(
    (rows[at]?.move?.words ?? []).map((w) => w.toLowerCase()),
  );
  if (at < 0 || targets.size === 0) return false;
  const has = (text: string) =>
    text
      .split(/[^A-Za-z']+/)
      .filter((w) => w !== "")
      .some(
        (w) =>
          targets.has(w.toLowerCase()) ||
          targets.has(lemmaOf(w)?.toLowerCase() ?? ""),
      );
  const between = rows.slice(at + 1).filter((row) => row.speaker === "child");
  if (between.length > LATE_CARD_ANSWER_MAX_GAP) return false;
  if (between.some((row) => has(row.text))) return false;
  return has(child);
}

/**
 * 다시 묻는 턴이 되는 단원 단어(02-2 271줄 · 13절 C202 (1)): 앞 회화 세션에서 만남(처음 스냅숏 metBefore) · 짧은 준비에서 보임(인사 뒤
 * prepWords — 건너뛴 낱말 포함, 대화 중 연 준비 move.prep) · 이 대화의 선생님 차례가 노렸거나(move.words) 꺼낸(move.intro) 낱말. 이 낱말을
 * 노린 질문에는 받침 0 의 따라 할 말 · 선택지를 쓰지 않는다(회화 턴 정규화가 거른다). 차례대로, 같은 낱말은 한 번.
 */
export function reaskWordsOf({
  turns,
  prepWords,
  metBefore,
}: {
  turns: readonly TalkLessonTurn[];
  prepWords: readonly string[];
  metBefore: readonly string[];
}): string[] {
  const out = new Set<string>([...metBefore, ...prepWords]);
  for (const row of turns) {
    if (row.speaker !== "teacher" || !row.move) continue;
    for (const w of [
      ...(row.move.prep?.words ?? []),
      ...row.move.words,
      ...row.move.intro,
    ])
      out.add(w);
  }
  return [...out];
}

/**
 * 이번 아이 말을 보낼 토막(회화 턴 입력 · 6.2): 인사 토막의 마지막 인사 질문 자리가 이 턴으로 끝나면(말로 답함 · 들리지 않음 ·
 * talk.dontknow_max 번째 막힘) '인사 끝'(C19), 그 밖은 지금 토막. 말 입력은 응답의 막힘 판단 전이라 답한 것으로 본다(옛 흐름과 같다).
 */
export function lessonTurnSegmentOf(
  position: Pick<
    TalkLessonPosition,
    "segment" | "phase" | "lastGreetingQuestion" | "stuckInSlot"
  >,
  cause: "speech" | "button" | "nospeech",
  settings: Pick<TalkLessonSettings, "dontknowMax">,
): TalkTurnSegment {
  if (position.segment === "more_talk") return "more_talk";
  if (position.phase === "talk") return "talk";
  return greetingEndsOf(
    position.lastGreetingQuestion,
    position.stuckInSlot,
    cause,
    settings,
  )
    ? "greeting_end"
    : "greeting";
}

// ── 다음 선생님 차례 계획 ─────────────────────────────────────────

/** 앱이 선생님 말 뒤에 붙이는 줄(화면 차례대로). 소리 줄은 1~3단계에서 글 없이 읽고 듣기 단추만 둔다(T2). */
export type TeacherAttachLine =
  | {
      kind: "question";
      /** 카드 인사 질문 · 카드 항목 질문 · 받침 둘째의 카드 쉬운 질문. */
      role: "greeting" | "card" | "easy";
      en: string;
      ko?: string;
      item: TalkCardItemRef;
    }
  /** 1~3단계 소리 줄: 받침 · 닫기 · 들리지 않음의 답(글 없음, move.sound.answer). */
  | { kind: "sound"; role: "answer"; en: string }
  /** 4단계부터 글로 보이는 답(대화 중 짧은 준비를 열며 닫는 자리). */
  | { kind: "answer_example"; en: string }
  /** 마무리 물음(앱 고정 대사). */
  | { kind: "closing"; en: string; ko?: string }
  /** 앱 대사('Now let's talk.'). */
  | { kind: "app_line"; en: string };

export type TeacherTurnPlan = {
  /** 차례 종류. none 은 지금 선생님 차례가 아님(아이 차례 · 고르기 차례 · 닫힘). */
  kind: TalkMoveKind | "none";
  /** 회화 턴 호출의 토막(AI 를 부르지 않으면 null). */
  segment: TalkTurnSegment | null;
  /** 회화 턴을 부른다(대화 첫 질문 · none 은 부르지 않음). */
  callsAi: boolean;
  /** 선생님(AI)이 질문 문장을 쓴다(AI 차례 · 받침 둘째 · 닫기). 카드 자리 · 마무리 자리 · 같이 말하기는 반응만. */
  aiAsks: boolean;
  why: TalkSlotWhy | null;
  cause: TalkChildCause | null;
  /** 이 차례의 받침 단계(0 없음). */
  stage: number;
  streak: number;
  /** 붙일 카드 항목 · 노린 단어 · 목표(AI 차례는 응답이 정하고, 받침 차례는 지금 자리의 것). */
  item: TalkCardItemRef;
  words: string[];
  goals: string[];
  attach: TeacherAttachLine[];
  /** 서버가 붙인 도움(move.app). */
  app: TalkAppHelp[];
  /** 지금 쓰면 안 되는 질문 글(questionKeyOf 꼴 — 막힌 바로 뒤 · 들리지 않음 뒤의 그 자리 질문). */
  blocked: string[];
  /** 막힌 질문 글(사용자 메시지 'Stuck question'). */
  stuckQuestion: string | null;
  /** 4단계부터 받침 둘째에서 AI 가 같은 질문을 되풀이하면 붙일 카드 쉬운 질문. */
  easyFallback: { en: string; ko?: string } | null;
  /** AI 가 준 답이 걸렸거나 없을 때 쓸 이 자리의 답(카드 답 예시 · AI 질문 답 예시). */
  answerFallback: string | null;
  /** 이 차례 뒤 열 짧은 준비 낱말(3.3 짧은 준비 (나)). 열지 않으면 null. */
  openPrep: string[] | null;
  followRun: number;
  /** 앞 차례가 카드 기회였고 아이가 말로 답했다(TalkLessonPosition.afterCardChance). */
  afterChance: boolean;
  /** 마지막 이어 묻기 뒤 선생님 차례 수(TalkLessonPosition.teacherTurnsSinceFollowUp). */
  sinceFollowUp: number;
  /** 아이가 답한 질문이 앱이 붙인 대화 첫 질문이면 그 글 · 카드 기회 여부(TalkLessonPosition.appAskedBefore). */
  appAsked: { en: string; card: boolean } | null;
  turnsLeft: number;
  chances: TalkChances;
};

type PlanCtx = {
  args: LessonArgs;
  pos: TalkLessonPosition;
  chances: TalkChances;
  low: boolean;
};

function questionLine(
  { args }: PlanCtx,
  item: TalkLessonItem,
  ref: TalkCardItemRef,
  role: "card" | "easy",
): TeacherAttachLine {
  const text = role === "easy" ? item.easyQuestion : item;
  return {
    kind: "question",
    role,
    en: text.en,
    ...(args.spec.koMeaning && text.ko ? { ko: text.ko } : {}),
    item: { ...ref },
  };
}

function greetingLine(
  { args }: PlanCtx,
  index: number,
): TeacherAttachLine | null {
  const g = args.card.greeting;
  const ko = args.spec.koMeaning;
  if ("questions" in g) {
    const q = g.questions[index];
    if (!q) return null;
    return {
      kind: "question",
      role: "greeting",
      en: q.question.en,
      ...(ko ? { ko: q.question.ko } : {}),
      item: { ...NO_CARD_ITEM },
    };
  }
  if (index > 0) return null;
  return {
    kind: "question",
    role: "greeting",
    en: g.firstLine.en,
    ...(ko && g.firstLine.ko ? { ko: g.firstLine.ko } : {}),
    item: { ...NO_CARD_ITEM },
  };
}

function basePlan(c: PlanCtx): TeacherTurnPlan {
  const { pos, chances } = c;
  return {
    kind: "none",
    segment: null,
    callsAi: false,
    aiAsks: false,
    why: null,
    cause: pos.lastRow === "child" ? pos.lastCause : null,
    stage: 0,
    streak: pos.streak,
    item: { ...NO_CARD_ITEM },
    words: [],
    goals: [],
    attach: [],
    app: [],
    blocked: [],
    stuckQuestion: null,
    easyFallback: null,
    answerFallback: null,
    openPrep: null,
    followRun: pos.followRun,
    afterChance: pos.afterCardChance,
    sinceFollowUp: pos.teacherTurnsSinceFollowUp,
    appAsked: pos.appAskedBefore,
    turnsLeft: pos.turnsLeft,
    chances,
  };
}

/** 붙일 카드 항목과 그 줄 · 노린 것. */
function withItem(
  c: PlanCtx,
  plan: TeacherTurnPlan,
  ref: TalkCardItemRef,
): TeacherTurnPlan {
  const item = cardItemOf(c.args.card, ref);
  if (!item) return plan;
  return {
    ...plan,
    item: { ...ref },
    words: [...item.targets],
    goals: [...item.goals],
    attach: [...plan.attach, questionLine(c, item, ref, "card")],
  };
}

function guardOf(c: PlanCtx, blocked: readonly string[]) {
  return {
    blocked,
    asked: c.pos.askedQuestions,
    max: c.args.settings.sameQuestionMax,
  };
}

/** 카드 자리에 붙일 가장 앞의 남은 기회. */
function chanceRef(
  c: PlanCtx,
  blocked: readonly string[],
): TalkCardItemRef | null {
  return slotChanceOf({
    card: c.args.card,
    chances: c.chances,
    ...guardOf(c, blocked),
  });
}

/**
 * 가장 앞의 남은 기회, 없으면 대신 질문(가장 오래전에 쓴 더 이야기할 거리). 받침 셋째 닫기 · 들리지 않음 닫기(1~3단계)와 대화 중 연
 * 짧은 준비 뒤 대화 첫 질문이 쓴다. 13절 C194 (1)(잠정, 첫 프리뷰에서 요청자 확인) — 02-2 192줄 '붙일 것이 없으면 AI 차례'의 예외로,
 * 1~3단계 닫기의 '답 소리 → 다음 질문' 차례(02-2 261줄)와 소리 줄을 tori_en 뒤에 읽는 규칙(02-2 204줄)을 함께 지킬 자리가 AI 차례에는
 * 없어서다. 회화 plan 정한 것 18 을 넓힌다.
 */
function chanceOrOldest(
  c: PlanCtx,
  blocked: readonly string[],
): TalkCardItemRef | null {
  return (
    chanceRef(c, blocked) ??
    oldestMoreOf({
      card: c.args.card,
      turns: c.args.turns,
      ...guardOf(c, blocked),
    })
  );
}

const aiPlan = (
  plan: TeacherTurnPlan,
  segment: TalkTurnSegment,
  aiAsks: boolean,
): TeacherTurnPlan => ({
  ...plan,
  kind: "ai",
  segment,
  callsAi: true,
  aiAsks,
});

const slotPlan = (
  plan: TeacherTurnPlan,
  segment: TalkTurnSegment,
  why: TalkSlotWhy | null,
): TeacherTurnPlan => ({
  ...plan,
  kind: "card_slot",
  segment,
  callsAi: true,
  aiAsks: false,
  why,
});

function openingPlan(c: PlanCtx): TeacherTurnPlan {
  const line = greetingLine(c, 0);
  return {
    ...basePlan(c),
    kind: "first_question",
    attach: line ? [line] : [],
  };
}

function firstQuestionPlan(c: PlanCtx): TeacherTurnPlan {
  const base: TeacherTurnPlan = {
    ...basePlan(c),
    kind: "first_question",
    cause: null,
    // 준비가 끝나면 이어진 막힌 차례 셈을 0 으로(02-2 176줄) — 되짚기가 이 행에서 0 으로 돌리는 값과 같게 move 에 싣는다
    streak: c.pos.prepPending ? 0 : c.pos.streak,
    attach: c.pos.prepPending ? [{ kind: "app_line", en: NOW_LETS_TALK }] : [],
  };
  const ref = c.pos.prepPending ? chanceOrOldest(c, []) : chanceRef(c, []);
  return ref ? withItem(c, base, ref) : base;
}

function soundAnswer(answer: string): TeacherAttachLine {
  return { kind: "sound", role: "answer", en: answer };
}

/** 인사 토막 안의 차례(인사 끝 전). */
function greetingPlan(
  c: PlanCtx,
  plan: TeacherTurnPlan,
  segment: TalkTurnSegment,
): TeacherTurnPlan {
  const { pos, low } = c;
  const answered = pos.answeredSlot;
  if (
    pos.slot !== null &&
    (pos.lastCause === "button" || pos.lastCause === "stuck")
  ) {
    const stage = Math.min(pos.stuckInSlot, STAGE_EASY);
    const answer = answered?.answerExample ?? null;
    const support = { ...plan, stage, answerFallback: answer };
    if (low && stage === STAGE_TOGETHER && answer)
      return {
        ...slotPlan(support, segment, "support"),
        attach: [soundAnswer(answer)],
        app: ["together", "answer_example"],
      };
    return aiPlan(support, segment, stage === STAGE_EASY);
  }
  const closedBy =
    pos.lastCause === "nospeech"
      ? 0
      : pos.lastCause !== null
        ? STAGE_CLOSE
        : null;
  const next = greetingLine(c, pos.greetingIndex);
  if (!low || !next)
    return aiPlan({ ...plan, stage: closedBy ?? 0 }, segment, true);
  const answer = answered?.answerExample ?? null;
  const attach: TeacherAttachLine[] = [];
  if (closedBy !== null && answer) attach.push(soundAnswer(answer));
  attach.push(next);
  return {
    ...slotPlan(
      { ...plan, stage: closedBy ?? 0 },
      segment,
      closedBy === null ? null : "support",
    ),
    attach,
    app: closedBy !== null && answer ? ["answer_example"] : [],
  };
}

/**
 * 인사 끝 턴(C19): 반응과 다음 토막으로 넘어가는 말뿐이고 카드 질문을 붙이지 않는다. 마지막 인사 질문 자리를 들리지 않음 · 셋째 막힘으로
 * 닫았으면 그 답을 한 번 들려준다(02-2 261 · 269줄) — 1~3단계는 인사 질문 답 예시를 소리로, 4단계부터는 AI 가 쓸 답(answerFallback).
 * 막힘 말(말 입력 · 응답 stuck 참)이면 몇 번째 막힘이든 닫기(stage 3)다. 말 입력은 막힘 판단 전에 토막을 '인사 끝'으로 보내므로
 * (lessonTurnSegmentOf) 같은 자리에서 같이 말하기 · 쉬운 질문을 이어 갈 수 없고, 답을 한 번 들려주고 넘어가는 것이 남은 길이다(N-1).
 */
function greetingEndPlan(
  c: PlanCtx,
  plan: TeacherTurnPlan,
  segment: TalkTurnSegment,
): TeacherTurnPlan {
  const cause = c.pos.lastCause;
  if (cause === null) return aiPlan(plan, segment, false);
  const answer = c.pos.answeredSlot?.answerExample ?? null;
  const base: TeacherTurnPlan = {
    ...plan,
    stage: cause === "nospeech" ? 0 : STAGE_CLOSE,
    answerFallback: answer,
  };
  if (c.low && answer)
    return {
      ...slotPlan(base, segment, "support"),
      attach: [soundAnswer(answer)],
      app: ["answer_example"],
    };
  return aiPlan(base, segment, false);
}

/** 대화 토막의 막힌 차례(단추 · 막힘 말). */
function stuckPlan(
  c: PlanCtx,
  plan: TeacherTurnPlan,
  segment: TalkTurnSegment,
): TeacherTurnPlan {
  const { pos, low, args, chances } = c;
  const s = pos.answeredSlot;
  const answer = s?.answerExample ?? null;
  const blocked = plan.blocked;
  const settings = args.settings;
  if (
    settings.prepMode === "when_needed" &&
    !pos.prepOpened &&
    pos.streak >= settings.prepOfferStuck
  ) {
    const words = stuckPrepWordsOf({
      stuckTargets: s?.words ?? [],
      pool: chances.notIntroduced,
      // 낱말 수 설정(talk.prep_words.<구간>) — 입력 args.prepWords(보인 낱말)와 다른 값이다
      count: settings.prepWords,
    });
    if (words.length > 0)
      return {
        ...slotPlan({ ...plan, stage: STAGE_CLOSE }, segment, "support"),
        // 1~3단계 답은 소리로만(T2 · 02-2 204 · 261줄), 4단계부터는 선생님 말 안의 글
        attach: answer
          ? [low ? soundAnswer(answer) : { kind: "answer_example", en: answer }]
          : [],
        app: answer ? ["answer_example", "prep"] : ["prep"],
        answerFallback: answer,
        openPrep: words,
      };
  }
  const stage =
    pos.stuckInSlot >= settings.dontknowMax
      ? STAGE_CLOSE
      : Math.min(pos.stuckInSlot, STAGE_EASY);
  const support: TeacherTurnPlan = {
    ...plan,
    stage,
    item: s ? { ...s.item } : { ...NO_CARD_ITEM },
    words: [...(s?.words ?? [])],
    goals: [...(s?.goals ?? [])],
    answerFallback: answer,
  };
  if (stage === STAGE_TOGETHER) {
    if (low && answer)
      return {
        ...slotPlan(support, segment, "support"),
        attach: [soundAnswer(answer)],
        app: ["together", "answer_example"],
      };
    return aiPlan(support, segment, false);
  }
  if (stage === STAGE_EASY) {
    const easy = s?.easyQuestion ?? null;
    const item = s ? cardItemOf(args.card, s.item) : undefined;
    if (low && easy && item && s)
      return {
        ...slotPlan(support, segment, "support"),
        attach: [questionLine(c, item, s.item, "easy")],
        app: ["easy_question"],
      };
    return { ...aiPlan(support, segment, true), easyFallback: easy };
  }
  // 닫기: 답을 한 번 들려주고 다음 이야기로(1~3단계는 다음 카드 자리 — 붙일 기회가 없으면 대신 질문, 13절 C194 (1) 잠정)
  if (!low) return aiPlan(support, segment, true);
  const ref = chanceOrOldest(c, blocked);
  if (!ref) return aiPlan(support, segment, true);
  const closing = slotPlan(
    {
      ...support,
      attach: answer ? [soundAnswer(answer)] : [],
      app: answer ? ["answer_example"] : [],
    },
    segment,
    "support",
  );
  return withItem(c, closing, ref);
}

/**
 * 들리지 않음 차례: 그 자리를 닫고 답을 한 번 들려준 뒤 다음 이야기로(받침 셋째의 닫기와 같은 꼴, 단계 · 셈 그대로). 1~3단계에서 붙일
 * 기회가 없으면 대신 질문이다(13절 C194 (1) 잠정).
 */
function noSpeechPlan(
  c: PlanCtx,
  plan: TeacherTurnPlan,
  segment: TalkTurnSegment,
): TeacherTurnPlan {
  const answer = c.pos.answeredSlot?.answerExample ?? null;
  const base = { ...plan, answerFallback: answer };
  if (!c.low) return aiPlan(base, segment, true);
  const ref = chanceOrOldest(c, plan.blocked);
  if (!ref) return aiPlan(base, segment, true);
  return withItem(
    c,
    {
      ...slotPlan(base, segment, "support"),
      attach: answer ? [soundAnswer(answer)] : [],
      app: answer ? ["answer_example"] : [],
    },
    ref,
  );
}

/** 말로 답한 차례: 마무리 자리 → 따라가기 상한의 카드 자리 → AI 차례. */
function answeredPlan(
  c: PlanCtx,
  plan: TeacherTurnPlan,
  segment: TalkTurnSegment,
): TeacherTurnPlan {
  const { pos, args } = c;
  if (pos.reachedNow || pos.roundEndedNow)
    return {
      ...plan,
      kind: "closing_slot",
      segment,
      callsAi: true,
      aiAsks: false,
      attach: [
        {
          kind: "closing",
          en: MORE_PROMPT.en,
          ...(args.spec.koMeaning ? { ko: MORE_PROMPT.ko } : {}),
        },
      ],
    };
  if (pos.followRun >= args.settings.followChildTurns) {
    const ref = chanceRef(c, []);
    if (ref) return withItem(c, slotPlan(plan, segment, "follow_cap"), ref);
  }
  return aiPlan(plan, segment, true);
}

/**
 * 다음 선생님 차례 계획(3.3 차례 표). 행이 없으면 첫 인사(앱), 대화 첫 질문 차례면 첫 필수 질문(앱 · 대화 중 연 준비 뒤는 'Now let's
 * talk.' 뒤 다음 필수 질문), 마지막 행이 아이 행이면 그 응답 차례다. 카드 자리는 (1) 따라가기 상한 (4) 받침이 카드 줄을 쓰는 때(1~3단계)와
 * 들리지 않음의 닫기에서만 만들고, (2) AI 질문 검사 · (3) 같은 질문은 응답이 끝난 뒤 부르는 쪽이 정한다(blocked · easyFallback ·
 * answerFallback · slotChanceOf · oldestMoreOf). 마무리 자리는 말 주고받기가 참고 턴에 닿은 턴 · '더 이야기하기' 한 번이 끝난 턴뿐이다.
 */
export function nextTeacherTurnOf(args: LessonArgs): TeacherTurnPlan {
  const pos = talkLessonPositionOf(args);
  const chances = talkChancesOf({
    card: args.card,
    newWords: args.newWords,
    turns: args.turns,
    carry: args.carry ?? { goals: [], words: [] },
    missionsDone: args.missionsDone ?? 0,
    settings: args.settings,
    prepWords: args.prepWords,
  });
  const c: PlanCtx = { args, pos, chances, low: isLowBand(args.spec) };
  const plan = basePlan(c);
  if (pos.closed) return plan;
  if (args.turns.length === 0) return openingPlan(c);
  if (pos.firstQuestionDue) return firstQuestionPlan(c);
  const last = args.turns.at(-1);
  if (pos.lastRow !== "child" || !last || last.speaker !== "child") return plan;
  // 한국어 질문 턴의 응답은 변경 단위 ⑤ 의 한국어 도움 길이다(이 흐름의 선생님 차례가 아님)
  if (last.koQuestion) return plan;
  // 저장된 행은 인사 끝도 토막 greeting 이다 — 되짚기가 본 인사 끝을 따른다(fix 1 I-A)
  const segment: TalkTurnSegment = pos.greetingEndNow
    ? "greeting_end"
    : last.segment;
  const s = pos.answeredSlot;
  const stuckOrSilent = pos.lastCause !== null;
  const withBlock: TeacherTurnPlan = stuckOrSilent
    ? {
        ...plan,
        blocked: [...new Set((s?.questions ?? []).map(questionKeyOf))],
        stuckQuestion: s?.question ?? null,
      }
    : plan;
  if (segment === "greeting_end") return greetingEndPlan(c, withBlock, segment);
  if (pos.phase === "greeting") return greetingPlan(c, withBlock, segment);
  if (pos.lastCause === "nospeech") return noSpeechPlan(c, withBlock, segment);
  if (pos.lastCause !== null) return stuckPlan(c, withBlock, segment);
  return answeredPlan(c, withBlock, segment);
}

/**
 * 말로 보낸 턴의 두 계획(답함 · 막힘): 막힘 판단(stuck)은 응답의 첫 칸이라 부르기 전에는 모른다. 부르는 쪽은 사용자 메시지에 두 경우를
 * 알리거나, stuck 칸이 온 뒤 맞는 계획을 고른다. '모름' 입력은 nextTeacherTurnOf 하나로 충분하다.
 */
export function teacherTurnPlansOf(
  args: LessonArgs,
  child: Pick<TalkLessonChildTurn, "segment" | "targets"> & {
    koQuestion?: boolean;
  },
): { ifAnswered: TeacherTurnPlan; ifStuck: TeacherTurnPlan } {
  const row = (stuck: boolean): TalkLessonChildTurn => ({
    speaker: "child",
    segment: child.segment,
    input: "speech",
    stuck,
    nospeech: false,
    targets: [...child.targets],
    ...(child.koQuestion ? { koQuestion: true } : {}),
  });
  return {
    ifAnswered: nextTeacherTurnOf({
      ...args,
      turns: [...args.turns, row(false)],
    }),
    ifStuck: nextTeacherTurnOf({ ...args, turns: [...args.turns, row(true)] }),
  };
}

/** 회화 턴 응답에서 move 에 옮길 값(앱 확인 · 정규화를 지난 것). AI 차례는 갈래 · 카드 항목 · 노린 것을 응답이 정한다. */
export type TeacherMoveAi = Partial<
  Pick<
    TalkMove,
    | "next"
    | "item"
    | "words"
    | "goals"
    | "intro"
    | "suggest"
    | "linked"
    | "held"
  >
> & { ai?: TalkSupport; next?: TalkNextMove };

/**
 * 선생님 행 move 만들기(정한 것 5 · 6): 계획의 종류 · 까닭 · 받침 단계 · 앞 아이 차례의 까닭 · 이어진 막힘 · 서버가 붙인 도움 ·
 * 1~3단계 소리 줄 글(sound) · 대화 중 연 짧은 준비에 응답 값을 더한다. 카드 자리 · 대화 첫 질문은 붙인 항목을, AI 차례는 응답의
 * 카드 항목 · 노린 것을 쓴다(없으면 계획 값 — 받침 차례는 지금 자리의 것).
 */
export function teacherMoveOf(
  plan: TeacherTurnPlan,
  ai: TeacherMoveAi = {},
): TalkMove {
  if (plan.kind === "none")
    throw new Error("선생님 차례가 아닌 계획으로 move 를 만들 수 없다");
  const fromAi = plan.kind === "ai";
  const sound = plan.attach.flatMap((l) => (l.kind === "sound" ? [l.en] : []));
  const input: TalkMoveInput = {
    kind: plan.kind,
    why: plan.why,
    next: ai.next ?? "none",
    item: fromAi && ai.item ? ai.item : plan.item,
    goals: fromAi && ai.goals ? ai.goals : plan.goals,
    words: fromAi && ai.words ? ai.words : plan.words,
    stage: plan.stage,
    cause: plan.cause,
    streak: plan.streak,
    app: plan.app,
    ai: ai.ai ?? "none",
    intro: ai.intro ?? [],
    ...(ai.suggest ? { suggest: ai.suggest } : {}),
    linked: ai.linked ?? [],
    held: ai.held ?? [],
    ...(sound.length > 0 ? { sound: { answer: sound.join(" ") } } : {}),
    ...(plan.openPrep ? { prep: { words: plan.openPrep } } : {}),
  };
  return talkMoveOf(input);
}

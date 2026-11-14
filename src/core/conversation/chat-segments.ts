// 회화 이야기 방식(talk.lead_mode 'chat', intent 2026-11-13-회화-대화-구조-R spec 설계 5 · 6 · 7 · 8-2, plan 묶음 S2 · fix 1)의 토막 접점 판단.
// 서버(src/server/conversation/index.ts · closing.ts)와 대본 도구(T1)가 같은 함수를 부른다(NFR-4 · AC-18): 할 일(chatStepOf) · 대화로 넘김
// (lessonAdvanceChatOf) · 다시 들어올 때의 끝 줄 신호(chatResumeSignalOf) · 판정 맥락(chatJudgeContextOf). 대화 첫 질문 차례가 아이 차례를 막는지는
// 턴 길(묶음 S1)의 판단(chat-turn-plan chatFirstQuestionBlocksOf)을 그대로 쓴다 — 두 길이 같은 값으로 갈려야 화면이 넘길 수 없는 넘김에 갇히지 않는다.
// 순수 모듈이다(DB · 서버 없음).
import { talkSceneWordsOf } from "@/core/ai/calls/talk-lesson";
import type { ChatJudgeContext } from "@/core/conversation/chat-judge";
import type { ChatEndSignal } from "@/core/conversation/chat-turn-core";
import {
  chatFirstQuestionBlocksOf,
  chatSignalOfRows,
} from "@/core/conversation/chat-turn-plan";
import {
  type LessonArgs,
  talkLessonPositionOf,
} from "@/core/conversation/lesson-flow";
import type { TalkChatSettings } from "@/core/conversation/lesson-turns";
import type { TALK_SEGMENTS } from "@/core/seed/structure";

type TalkSegment = (typeof TALK_SEGMENTS)[number];

/**
 * 토막 판단의 입력: 위치 되짚기의 입력(LessonArgs — 카드 · 규격 · 흐름 행 · 토막 · 설정 · 보인 준비 낱말)에 처음 스냅숏의 준비 계획과 끊긴 아이 행
 * 여부를 더한 것. 서버의 LessonCore 가 이 꼴을 품는다(구조로 맞음).
 */
export type ChatSegmentCore = LessonArgs & {
  /** 처음 스냅숏의 짧은 준비 계획(인사 끝 뒤 준비로 갈지). */
  prepPlan: readonly string[];
  /** 선생님 말이 없는 마지막 아이 행이 있다. */
  orphan: boolean;
};

/** 이야기 방식에서 기존 판정과 다르게 낸 할 일(서버 TalkLessonStep 의 일부). */
export type ChatStep = { kind: "advance"; to: "talk" } | { kind: "child" };

/** 선생님 행이 하나라도 있는가(흐름 꼴 · talk_turns 행 모두 — 수업 첫 말 차례를 가른다). */
export function chatHasTeacherTurn(
  turns: readonly { speaker: "teacher" | "tori" | "child" }[],
): boolean {
  return turns.some((t) => t.speaker !== "child");
}

const isDialogSegment = (segment: TalkSegment) =>
  segment === "talk" || segment === "more_talk";

/**
 * 이야기 방식 수업의 할 일 가운데 기존 판정과 다른 것(spec 설계 5, 묶음 S2 · fix 1 I-1). (1) 수업 첫 말 차례(인사 토막이고 선생님 행이 없음 — 카드
 * 인사 행을 넣지 않았다): 토막 넘김(advance talk)이고 그 넘김이 신호 start 를 낸다. (2) 대화 · 더 이야기하기 토막에서 위치 되짚기가 '대화 첫 질문
 * 차례'라고 할 때: 이야기 방식에는 카드 첫 필수 질문이 없고 대화 토막의 선생님 행은 kind ai 라(돌아옴 차례만 first_question), 준비가 없던 수업은 물음
 * 없는 선생님 말 뒤마다 그 값이 참이다. 턴 길처럼 chatFirstQuestionBlocksOf 로 읽어, 막는 때(짧은 준비가 열렸고 돌아옴 차례 전)는 대화 토막이면
 * 넘김(돌아옴 신호 back), 그 밖은 아이 차례다. 그 밖은 null(기존 판정 그대로).
 */
export function chatStepOf(core: ChatSegmentCore): ChatStep | null {
  if (core.segment === "greeting" && !chatHasTeacherTurn(core.turns))
    return { kind: "advance", to: "talk" };
  if (!isDialogSegment(core.segment) || core.orphan) return null;
  const pos = talkLessonPositionOf(core);
  if (pos.lastRow !== "teacher" || pos.choice !== null || !pos.firstQuestionDue)
    return null;
  return chatFirstQuestionBlocksOf(pos) && core.segment === "talk"
    ? { kind: "advance", to: "talk" }
    : { kind: "child" };
}

/**
 * 대화로 넘김의 이야기 방식 몫: 바꿀 토막과 화면이 부를 입구 신호(start 수업 첫 말 · back 짧은 준비 뒤 돌아옴, 없으면 null = 부르지 않음).
 * 붙일 카드 행은 없다.
 */
export type LessonAdvanceChat =
  | { ok: true; segment: TalkSegment; lead: "start" | "back" | null }
  | { ok: false };

/**
 * 대화로 넘김의 이야기 방식 몫(이야기 방식 spec 설계 5 · 보완 4 (5), 묶음 S2). 카드 행을 붙이지 않는다. 'AI 쉬는 중'을 읽지 않는다(쉬는 중이어도
 * 신호 start — 턴 길이 호출 없이 카드 인사 첫 줄 행을 넣는다, 컨트롤러 결정 T-492).
 * - 수업 첫 말(인사 토막 · 선생님 행 없음): 토막 그대로 신호 start.
 * - 인사 끝 · 짧은 준비가 없는 수업(인사 토막 · 준비 계획 없음): 토막만 대화로, 신호 없음(호출 사이에 아무것도 끼우지 않는다 — 같은 대화가 이어진다).
 * - 짧은 준비 끝(준비 토막) · 대화 토막에 돌아옴 차례가 아직 없음(다시 열어 같은 넘김을 다시 받음): 대화 토막, 신호 back. 준비에서 보인 낱말이 없으면
 *   (위치 prepOpened 거짓 — 턴 길의 back 받기 조건과 같음) 신호 없이 대화 토막으로 간다.
 * 그 밖(정리 · 끊긴 아이 행 · 고를 차례 · 마지막이 아이 행 · 인사가 덜 끝남 · 더 이야기하기 토막)은 받지 않는다.
 */
export function lessonAdvanceChatOf(core: ChatSegmentCore): LessonAdvanceChat {
  const no = { ok: false } as const;
  if (core.segment === "wrap_up" || core.orphan) return no;
  if (!chatHasTeacherTurn(core.turns))
    return core.segment === "greeting"
      ? { ok: true, segment: "greeting", lead: "start" }
      : no;
  const pos = talkLessonPositionOf(core);
  if (pos.lastRow !== "teacher" || pos.choice !== null || !pos.greetingDone)
    return no;
  if (core.segment === "greeting")
    return core.prepPlan.length > 0
      ? no
      : { ok: true, segment: "talk", lead: null };
  if (core.segment === "prep")
    return { ok: true, segment: "talk", lead: pos.prepOpened ? "back" : null };
  if (core.segment === "talk" && pos.firstQuestionDue && pos.prepOpened)
    return { ok: true, segment: "talk", lead: "back" };
  return no;
}

/**
 * 이야기 방식 수업에 다시 들어왔을 때의 끝 줄 신호(spec 설계 6 · 7, 검토 rev-chat-p35 6절 S2-3): 턴 길이 끝 줄을 낼 때와 같은 판단을 저장된 행으로 다시
 * 한다(묶음 S1 chat-turn-plan chatSignalOfRows — 차례 끝은 마지막 선생님 행의 move, 잇달아 말한 수는 거르지 않은 행, 그 차례를 연 입력은 바로 앞 행,
 * 다음이 짧은 준비인지는 그 행의 사실 줄). 'AI 쉬는 중'은 부르는 쪽이 넘긴다(토막 넘김 결과처럼 모르면 거짓).
 */
export function chatResumeSignalOf(
  state: {
    liveRows: Parameters<typeof chatSignalOfRows>[0]["rows"];
    settings: { chat: TalkChatSettings };
  },
  aiResting: boolean,
): ChatEndSignal {
  return chatSignalOfRows({
    rows: state.liveRows,
    aiResting,
    settings: state.settings.chat,
  });
}

/**
 * 이야기 방식 판정의 수업 맥락(chat-judge ChatJudgeContext, 묶음 S2 fix 1 I-2): 단원 단어와 장면 낱말(talkSceneWordsOf — 지금 새 방식과 같은 값)은
 * 넘긴 단원 단어에서 만든다. 부르는 쪽은 단계 맥락의 단원 단어(서버 levelContextOf 의 unitWords — 단원 규격 targetVocab, spec 표 85줄 {UNIT_WORDS})를
 * 넘긴다. 턴 길(첫 판정 · 응답 뒤 평가)과 닫는 길(남은 평가)이 같은 값을 써야 닫을 때의 다시 세기가 앞 차례의 저장된 판정을 바꾸지 않는다. 원형 표 ·
 * 단계 구간 · 선생님 영어 이름(시드 nameEn)은 수업에서 온다. 아이 이름은 없다.
 */
export function chatJudgeContextOf(
  lesson: {
    lemmaOf: (surface: string) => string | undefined;
    card: Parameters<typeof talkSceneWordsOf>[0]["card"];
    spec: { band: ChatJudgeContext["spec"]["band"] };
    teacher: { nameEn: string } | null;
  },
  {
    unitWords,
    homophones,
  }: {
    unitWords: readonly string[];
    homophones: readonly (readonly string[])[];
  },
): ChatJudgeContext {
  return {
    unitWords,
    lemmaOf: lesson.lemmaOf,
    homophones,
    sceneWords: talkSceneWordsOf({
      card: lesson.card,
      unitWords: [...unitWords],
    }),
    spec: { band: lesson.spec.band },
    teacherName: lesson.teacher?.nameEn ?? null,
  };
}

// 회화 수업 끝(3.3 '수업 끝' 참여 완료 · 끝난 길 표 · '대화가 멈추는 경우' 그만하기 행, 회화 plan 정한 것 6 · 12, 3.5 별 · 친한 정도).
// 참여 완료는 자연스러운 종료와 충분한 참여이고 턴 수 · 카드 기회를 다 다뤘는지는 조건이 아니다(C188). 참여가 거의 없음은 대화 토막
// (인사 토막 뒤)에 말 주고받기에 드는 아이 턴이 하나도 없는 사실이고, 이때의 '그만하기'만 확인 쪽지(C34)를 묻는다. 숫자 문턱은 없다.
// 순수 모듈이다.
import {
  type FriendshipRules,
  friendshipAfter,
} from "@/core/conversation/friendship";
import {
  childCauseOf,
  type TalkLessonTurn,
} from "@/core/conversation/lesson-turns";

/**
 * 참여가 거의 없음(정한 것 12): 인사 토막 뒤 대화 토막(대화 · 더 이야기하기)에 입력이 말이고 막힘이 아닌 아이 턴(한국어 질문 턴 뺌)이
 * 하나도 없다. 입력에 참고 턴 · 비율을 두지 않는다.
 */
export function talkNearlySilent(turns: readonly TalkLessonTurn[]): boolean {
  return !turns.some(
    (row) =>
      row.speaker === "child" &&
      (row.segment === "talk" || row.segment === "more_talk") &&
      !row.koQuestion &&
      childCauseOf(row) === null,
  );
}

/**
 * 끝난 길(3.3 표): 마무리 물음에 답함 · 바닥선 · '그만하기'(참여가 거의 없음이 아님, 마무리 제안 뒤 포함) · 확인 쪽지에서 그만두기 ·
 * 취소 · 앱을 닫음 · '홈' · 'AI 쉬는 중'(끝나지 않음).
 */
export type TalkEndPath =
  | "closing_question"
  | "floor"
  | "stop"
  | "suggestion"
  | "stop_confirmed"
  | "stop_cancelled"
  | "interrupted";

/** 끝맺음 기록(attempts talk-closing)의 reason 에 더하는 값(정한 것 6). 구석 '그만하기'는 stop 그대로다. */
export type TalkEndReason =
  | "closing_question"
  | "floor"
  | "stop"
  | "suggestion"
  | "stop_confirmed";

export type TalkEnd = {
  /** 완료(참여 완료) · 중단 · 확인 쪽지를 물음 · 대화를 이음 · 진행(끝나지 않음). */
  outcome: "completed" | "aborted" | "confirm" | "continue" | "in_progress";
  reason: TalkEndReason | null;
  /** 별(R12 '끝까지 하면 1개'). */
  stars: 0 | 1;
  /** 친한 정도가 오르는 끝인가(참여 완료, 3.5 · talk.friendship_per_talk). */
  friendship: boolean;
};

const NOT_ENDED = { reason: null, stars: 0, friendship: false } as const;

/** 끝난 길 하나의 처리(3.3 표). */
export function talkEndOf({ path }: { path: TalkEndPath }): TalkEnd {
  switch (path) {
    case "closing_question":
    case "floor":
    case "stop":
    case "suggestion":
      return { outcome: "completed", reason: path, stars: 1, friendship: true };
    case "stop_confirmed":
      return {
        outcome: "aborted",
        reason: "stop_confirmed",
        stars: 0,
        friendship: false,
      };
    case "stop_cancelled":
      return { outcome: "continue", ...NOT_ENDED };
    case "interrupted":
      return { outcome: "in_progress", ...NOT_ENDED };
  }
}

/**
 * '그만하기'를 골랐을 때(구석 단추 · 마무리 물음 · 마무리 제안의 두 버튼): 마무리 물음에 이미 답했으면(참여 완료 (1)) 그 끝이고,
 * 참여가 거의 없으면 확인 쪽지를 묻고, 아니면 확인 없이 참여 완료다(카드 기회가 남아도 같다).
 */
export function talkStopOf({
  turns,
  closingAnswered,
  suggestion,
}: {
  turns: readonly TalkLessonTurn[];
  /** 마무리 물음에 답했다(지금 마무리 물음의 '그만하기'면 참). */
  closingAnswered: boolean;
  /** 마무리 제안(갈래 '마무리')의 두 버튼에서 골랐다. */
  suggestion: boolean;
}): TalkEnd {
  if (closingAnswered) return talkEndOf({ path: "closing_question" });
  if (talkNearlySilent(turns)) return { outcome: "confirm", ...NOT_ENDED };
  return talkEndOf({ path: suggestion ? "suggestion" : "stop" });
}

/** 친한 정도(3.5): 참여 완료한 수업만 오르고(다시 하기는 그대로), 나머지 끝은 그대로다. */
export function talkFriendshipAfter(
  end: Pick<TalkEnd, "friendship">,
  state: Parameters<typeof friendshipAfter>[0],
  rules: FriendshipRules,
): ReturnType<typeof friendshipAfter> {
  if (!end.friendship)
    return {
      friendship: state.friendship,
      opened: state.opened,
      unlocked: null,
    };
  return friendshipAfter(state, rules);
}

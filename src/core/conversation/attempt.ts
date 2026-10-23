// 회화 시도 꼴(attempts.input)과 활동 번호(5절 attempts · C89 · 회화 수업 모델 4, plan-p13a 파일별 값 13).
// 처음 스냅숏 · 따라 말하기(오늘 쓸 말 · 말해 보기 · 정리 · 마무리 한 번 더 말해 보기) · 끝맺음 기록(닫힌 까닭). 점수 · 단어별 정오는 없다(회화는
// 채점하지 않음 — R2). P11a src/core/session/attempt.ts 는 고치지 않는다(회화 시도는 회화 서버만 읽고 쓴다, 정할 것 회3). 순수 모듈이다.
import { z } from "zod";
import { TEACHER_KEY } from "@/core/seed/structure";

/** 시도 꼴 판(P11a INPUT_VERSION 과 같은 1). */
const TALK_INPUT_VERSION = 1;
/** 처음 스냅숏의 활동 번호. 따라 말하기는 그 뒤부터. */
export const TALK_START_ACTIVITY_NO = 1;
/** 끝맺음 기록의 활동 번호(제안 — 학습 활동이 아니라 0). */
export const TALK_CLOSING_ACTIVITY_NO = 0;

export const talkStartAttemptId = (sessionId: string) =>
  `talk-start:${sessionId}`;
export const talkClosingAttemptId = (sessionId: string) =>
  `talk-closing:${sessionId}`;

const head = <K extends string>(kind: K) => ({
  v: z.literal(TALK_INPUT_VERSION),
  kind: z.literal(kind),
  step: z.literal("final"),
});
const index = z.int().min(0);
const spoken = {
  /** 따라 말한 목표 글(단어 · 예문 · 되짚을 말). */
  target: z.string(),
  heard: z.array(z.string()),
  failures: z.int().min(0),
  skipped: z.enum(["recognition", "no_mic", "silent", "stalled"]).optional(),
};

/** 끝맺음 기록의 닫힌 까닭(대화 안전 상한 셈 · 기록 — b closing.ts, 컨트롤러 결정 2026-10-22 fix 1). */
export const TALK_CLOSING_REASONS = [
  "stop",
  "leave",
  "safety",
  "resting",
  "idle",
  "aborted",
] as const;
export type TalkClosingReason = (typeof TALK_CLOSING_REASONS)[number];

export const TalkAttemptInputSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    ...head("talk-start"),
    /** 오늘 쓸 말로 보인 단어(차례). */
    shownWords: z.array(z.string()),
    /** 이 세션 앞에 만난 단원 단어(처음 · 다시 묻는 턴 판정, C2). */
    metBefore: z.array(z.string()),
    /** 말해 보기 바퀴마다의 차례(practiceOrderOf). */
    practiceOrder: z.array(z.array(index)),
    /** 이 대화의 회화 선생님 키(한 대화는 이 키로 끝까지 — 선생님 화면 plan 값 7). 선생님 전 옛 스냅숏에는 없다. */
    teacherKey: z.string().regex(TEACHER_KEY).optional(),
  }),
  z.strictObject({ ...head("talk-today"), ...spoken, index }),
  z.strictObject({
    ...head("talk-practice"),
    ...spoken,
    index,
    round: index,
  }),
  z.strictObject({ ...head("talk-wrapup"), ...spoken, index }),
  z.strictObject({ ...head("talk-again"), ...spoken }),
  /** 끝맺음 기록(activity_no 0 — 상태는 ai_feedback 칸). */
  z.strictObject({
    ...head("talk-closing"),
    reason: z.enum(TALK_CLOSING_REASONS),
  }),
]);
export type TalkAttemptInput = z.infer<typeof TalkAttemptInputSchema>;

/** 회화 시도 입력을 읽는다. 꼴이 틀리면 undefined. */
export function parseTalkAttemptInput(
  raw: unknown,
): TalkAttemptInput | undefined {
  const parsed = TalkAttemptInputSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

export type FollowAlongCounts = {
  todayWords: number;
  practiceItems: number;
  practiceRounds: number;
  wrapUp: number;
};

/**
 * 따라 말하기의 활동 번호(attempts.activity_no): 처음 스냅숏(1) 뒤로 오늘 쓸 말 → 말해 보기 바퀴마다 → 정리 → 마무리 한 번 더 말해 보기.
 * 범위 밖 차례는 던진다.
 */
export function followAlongNo(
  at: {
    segment: "today_words" | "practice" | "wrap_up" | "again";
    index: number;
    round?: number;
  },
  counts: FollowAlongCounts,
): number {
  const inRange = (i: number, n: number) =>
    Number.isInteger(i) && i >= 0 && i < n;
  const base = TALK_START_ACTIVITY_NO + 1;
  const practiceStart = base + counts.todayWords;
  const wrapStart =
    practiceStart + counts.practiceItems * counts.practiceRounds;
  const againNo = wrapStart + counts.wrapUp;
  switch (at.segment) {
    case "today_words":
      if (!inRange(at.index, counts.todayWords)) break;
      return base + at.index;
    case "practice": {
      const round = at.round ?? 0;
      if (
        !inRange(at.index, counts.practiceItems) ||
        !inRange(round, counts.practiceRounds)
      )
        break;
      return practiceStart + round * counts.practiceItems + at.index;
    }
    case "wrap_up":
      if (!inRange(at.index, counts.wrapUp)) break;
      return wrapStart + at.index;
    case "again":
      return againNo;
  }
  throw new RangeError(
    `회화 따라 말하기 차례가 범위 밖이다: ${at.segment} ${at.index}`,
  );
}

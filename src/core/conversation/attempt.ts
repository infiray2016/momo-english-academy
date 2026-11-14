// 회화 시도 꼴(attempts.input)과 활동 번호(5절 attempts · C89 · 회화 수업 모델 4, plan-p13a 파일별 값 13).
// 처음 스냅숏 · 따라 말하기(C189: 짧은 준비 · 바닥선 듣기 활동 · 정리 · 한 번 더) · 끝맺음 기록(닫힌 까닭). 새 흐름 몫은 회화 plan 묶음 7
// ('이름' 절 107줄 — 판 1 그대로 더하기만), 옛 흐름의 오늘 쓸 말 · 말해 보기 시도 꼴은 묶음 12 가 지웠다. 점수 · 단어별 정오는 없다(회화는
// 채점하지 않음 — R2). P11a src/core/session/attempt.ts 는 고치지 않는다(회화 시도는 회화 서버만 읽고 쓴다, 정할 것 회3). 순수 모듈이다.
import { z } from "zod";
import { TEACHER_KEY } from "@/core/seed/structure";
import { ClientListenSchema } from "./client-listen";
import { TALK_LEAD_MODES } from "./lead-mode";

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
/**
 * 따라 말하기를 건너뛴 까닭(인식 실패 상한 · 마이크 없음 · 말소리 없음 · 멈춤 · 마이크 안 잡힘 이어짐). mic_deaf 는 기술 사유다 — 같은 자리에서
 * '마이크 안 잡힘'이 speech.deaf_skip_after 번 이어짐(아이의 실패 · 말소리 없음이 아님, 잠정 11-06 fix 2 · 13절 C210 보완).
 */
export const TALK_FOLLOW_SKIPS = [
  "recognition",
  "no_mic",
  "silent",
  "stalled",
  "mic_deaf",
] as const;
const SKIPS = TALK_FOLLOW_SKIPS;
const spoken = {
  /** 따라 말한 목표 글(단어 · 예문 · 되짚을 말 · 들려줄 말). */
  target: z.string(),
  heard: z.array(z.string()),
  failures: z.int().min(0),
  skipped: z.enum(SKIPS).optional(),
  /** 그 차례의 듣기 사건 요약(C149 — 글 · 소리 없음). 이 칸 전 옛 시도에는 없다. */
  clientListen: ClientListenSchema.optional(),
};

/**
 * 짧은 준비가 열린 자리(3.3 짧은 준비): 인사 뒤(1~3단계 늘 · 4단계부터 앞 수업 바닥선 (가)) · 대화 중(막힌 차례 (나), 선생님 행 move.prep 에도
 * 남음). 흐름 입력 prepWords 는 인사 뒤 자리의 낱말만이다(prepWordsShownOf).
 */
export const TALK_PREP_PLACES = ["greeting", "talk"] as const;
export type TalkPrepPlace = (typeof TALK_PREP_PLACES)[number];

/**
 * 끝맺음 기록의 닫힌 까닭(대화 안전 상한 셈 · 기록 — b closing.ts, 컨트롤러 결정 2026-10-22 fix 1). 새 흐름의 끝난 길(정한 것 6):
 * 마무리 물음에 답함 · 마무리 제안 뒤 그만하기 · 바닥선 · 확인 쪽지 뒤 그만두기. 구석 '그만하기'는 stop 그대로다.
 */
export const TALK_CLOSING_REASONS = [
  "closing_question",
  "suggestion",
  "floor",
  "stop_confirmed",
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
    /** 옛 흐름 칸(판 1 그대로 — 새 흐름은 빈 목록을 쓴다). */
    shownWords: z.array(z.string()),
    /** 이 세션 앞에 만난 단원 단어(처음 · 다시 묻는 턴 판정, C2). */
    metBefore: z.array(z.string()),
    /** 옛 흐름 칸(판 1 그대로 — 새 흐름은 빈 목록을 쓴다). */
    practiceOrder: z.array(z.array(index)),
    /** 이 대화의 회화 선생님 키(한 대화는 이 키로 끝까지 — 선생님 화면 plan 값 7). 선생님 전 옛 스냅숏에는 없다. */
    teacherKey: z.string().regex(TEACHER_KEY).optional(),
    /**
     * 새 흐름: 세션 시작 때 정한 짧은 준비 낱말 계획(카드 prep · 다지기 · 보강은 이월 단어를 앞세워 고른 것, 차례). 실제로 보인 낱말은
     * talk-prep 시도로 안다(prepWordsShownOf — when_needed 수업은 이 계획과 다를 수 있다). 옛 흐름 스냅숏에는 없다.
     */
    prepWords: z.array(z.string()).optional(),
    /** 새 흐름: 세션 시작 때 한 번 계산한 이월(우선 연습 후보, 정한 것 7 — 둘째 묶음 18 이 채운다). */
    carry: z
      .strictObject({ goals: z.array(z.string()), words: z.array(z.string()) })
      .optional(),
    /**
     * 회화 방식(talk.lead_mode — 회화 Claude 주도 묶음 M · 이야기 방식 묶음 C): 수업을 처음 열 때 읽은 설정 값. 서버는 claude · chat 일 때만 적는다
     * (leadModeStartField, 칸 없음 = app). 그 세션은 끝까지 이 값을 쓴다(leadModeOf).
     * 이 칸 전 옛 스냅숏에는 없고, 모르는 값이 들어 있어도 스냅숏 전체를 버리지 않게 칸만 비운다(둘 다 app 으로 읽음).
     */
    leadMode: z.enum(TALK_LEAD_MODES).optional().catch(undefined),
  }),
  z.strictObject({ ...head("talk-wrapup"), ...spoken, index }),
  /** 새 흐름 짧은 준비 따라 말하기(낱말 하나 · 열린 자리). index 는 그 자리 쪽지 차례다. */
  z.strictObject({
    ...head("talk-prep"),
    ...spoken,
    index,
    word: z.string(),
    place: z.enum(TALK_PREP_PLACES),
  }),
  /** 새 흐름 바닥선 듣기 활동(꼴만 — 동작은 둘째 묶음 16). 작은 '다음' 단추로 넘기면 skipped next. */
  z.strictObject({
    ...head("talk-floor"),
    ...spoken,
    skipped: z.enum([...SKIPS, "next"]).optional(),
    index,
    word: z.string(),
  }),
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

// ── 따라 말하기 활동 번호(C189) ──────────────────────────────────────

export type LessonFollowCounts = {
  /** 카드 오늘 쓸 말 수(바닥선 듣기 활동의 범위, plan 107줄). */
  todayWords: number;
  /**
   * talk.prep_words.<구간>(부르는 쪽이 설정값에서 넘긴다). 다지기 · 보강 카드는 오늘 쓸 말이 비어도 짧은 준비를 이 수까지 하므로
   * (02-2:173) 짧은 준비 범위는 max(오늘 쓸 말 수, 이 값)이다.
   */
  prepWords: number;
  /** 정리 되짚을 말 수. */
  wrapUp: number;
};

/**
 * 새 흐름 따라 말하기의 활동 번호: 처음 스냅숏(1) 뒤로 짧은 준비 → 바닥선 듣기 활동 → 정리 → 한 번 더 말해 보기. 짧은 준비 범위는
 * max(카드 오늘 쓸 말 수, talk.prep_words.<구간>)이고(다지기 · 보강 카드, 02-2:173) 바닥선 범위는 카드 오늘 쓸 말 수다(인사 뒤 ·
 * 대화 중 준비는 한 수업에 한 번이라 같은 번호대를 쓴다, 02-2:176). 범위 밖 차례는 던진다.
 */
export function lessonFollowAlongNo(
  at: { segment: "prep" | "floor" | "wrap_up" | "again"; index: number },
  counts: LessonFollowCounts,
): number {
  const inRange = (i: number, n: number) =>
    Number.isInteger(i) && i >= 0 && i < n;
  const prepRange = Math.max(counts.todayWords, counts.prepWords);
  const prepStart = TALK_START_ACTIVITY_NO + 1;
  const floorStart = prepStart + prepRange;
  const wrapStart = floorStart + counts.todayWords;
  const againNo = wrapStart + counts.wrapUp;
  switch (at.segment) {
    case "prep":
      if (!inRange(at.index, prepRange)) break;
      return prepStart + at.index;
    case "floor":
      if (!inRange(at.index, counts.todayWords)) break;
      return floorStart + at.index;
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

/** 새 흐름 따라 말하기의 끝낸 차례(같은 차례를 두 번 세지 않는다). prep 은 자리 · 쪽지 차례 순이다. */
export type LessonFollowDone = {
  prep: { place: TalkPrepPlace; index: number; word: string }[];
  floor: number[];
  wrapUp: number[];
  again: boolean;
};

export function lessonFollowDoneOf(
  inputs: readonly unknown[],
): LessonFollowDone {
  const out: LessonFollowDone = {
    prep: [],
    floor: [],
    wrapUp: [],
    again: false,
  };
  for (const raw of inputs) {
    const input = parseTalkAttemptInput(raw);
    if (!input) continue;
    if (
      input.kind === "talk-prep" &&
      !out.prep.some((p) => p.place === input.place && p.index === input.index)
    )
      out.prep.push({
        place: input.place,
        index: input.index,
        word: input.word,
      });
    else if (input.kind === "talk-floor" && !out.floor.includes(input.index))
      out.floor.push(input.index);
    else if (input.kind === "talk-wrapup" && !out.wrapUp.includes(input.index))
      out.wrapUp.push(input.index);
    else if (input.kind === "talk-again") out.again = true;
  }
  const placeOrder = (p: TalkPrepPlace) => TALK_PREP_PLACES.indexOf(p);
  out.prep.sort(
    (a, b) => placeOrder(a.place) - placeOrder(b.place) || a.index - b.index,
  );
  out.floor.sort((a, b) => a - b);
  out.wrapUp.sort((a, b) => a - b);
  return out;
}

/**
 * 흐름 입력 prepWords(lesson-flow LessonArgs · chances): 인사 뒤 준비 토막을 실제로 지났을 때 쪽지로 보인 낱말 전부 — 인식 실패 · 말소리
 * 없음으로 건너뛴 낱말도 든다(02-2:175). 쪽지 차례대로, 같은 낱말은 한 번. 처음 스냅숏의 계획 목록(talk-start prepWords)은 쓰지 않는다
 * (when_needed 수업 · 보일 낱말이 없는 다지기 수업에서 보인 낱말과 다르다 — 묶음 5 검토 I-2). 대화 중 연 준비는 move.prep 이 맡는다.
 */
export function prepWordsShownOf(inputs: readonly unknown[]): string[] {
  const out: string[] = [];
  for (const p of lessonFollowDoneOf(inputs).prep)
    if (p.place === "greeting" && !out.includes(p.word)) out.push(p.word);
  return out;
}

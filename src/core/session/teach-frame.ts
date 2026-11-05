// 가르치는 수업 세션 틀의 순수 함수(가르치고 배우는 수업 plan 묶음 라-2 · 델타 spec 설계 1 · 5 · 9 · 10, 정본 15절 AC-22c · AC-3d · AC-4d ·
// AC-N20, 장부 L-34). DB · 화면 · 음성 접점 · 시계 없음. 세션 틀(session-frame)과 읽기 · 쓰기 조각이 부르고 단위 시험이 본다.
// - 짝 고르기(L-34 '서버 값 합치기'): 서버가 저장된 혼자 첫 시도로 센 결과(화면 자료 view.spares.outcomes)를 이 기기에서 낸 첫 끝 시도의 결과와
//   합쳐 같은 함수(sparesToShow)로 고른다. 같은 활동은 서버 값이 이긴다. 다른 기기에서 이어 하면 서버 값만 남는다.
// - 무음 모드 줄: 선생님 줄의 '소리가 안 나와서 글로 봐요'가 한 세션에서 두 번째로 나면 무음 모드 줄(아이패드 사파리)을 더하고, 소리가 난 줄이
//   끝나면 거둔다(UI · UX spec R-57 · 가르치고 spec 설계 10).
// - 읽기 도움(설계 9 · C175 (1)): 글(지문 · 짝 글)마다 읽어 주기 누름과 뜻을 연 낱말을 모아, 그 뒤 첫 답의 시도 꼴 aid 로 보낸다.
// - 쓰기 색 칸(설계 1 '틀린 뒤 차례' 쓰기 행 · 표본 W10): 정답 카드 차례에서 칸마다의 칩 자리(무엇 · is · 어때요 · 마침표)를 가린다.
// - 같이 해 보기 한 시도의 정오: 공용 순수 함수 togetherOutcomeOf 에 시도 하나를 넣어 본다(새 채점 규칙 없음).
// - 여는 차례(묶음 마-2 · 설계 4 [L3 · C177] · AC-3i): 막힘 → 쉼 → '선생님을 골라요'(teach 수업 · 고른 선생님 없음) → 수업.
// - 말하기(묶음 라-3 · 설계 1 '틀린 뒤 차례' 말하기 행 · 5 · 10): 끊어 들려줄 조각(시드 chunks) · 따라 말하기와 질문 답의 단계 · 듣기 다시의
//   느린 빠르기 · 'AI 쉬는 중'에 건너뛸 혼자 질문 · 서버 액션이 저장한 AI 질문 끝 시도의 기기 몫 사본(짝 고르기 입력).
import { cardTokensOf } from "@/core/answer/expected";
import type { LessonOf } from "@/core/seed/schema/lesson";
import type { TeachChipRole } from "@/core/seed/structure";
import {
  type AttemptInput,
  INPUT_VERSION,
  type OutcomeContext,
  questionJudgeContextOf,
  type SoloOutcome,
} from "@/core/session/attempt";
import type { Activity } from "@/core/session/preview";
import {
  isTeachActivities,
  TEACH_SLOT_OF,
  type TeachSlot,
} from "@/core/session/progress";
import { togetherOutcomeOf } from "@/core/session/spare-outcome";
import {
  firstFinalsOf,
  type SpareChoice,
  soloOutcomesOf,
  sparesToShow,
} from "@/core/session/spares";
import {
  type JudgeableQuestion,
  judgeableQuestion,
  judgeSpeakingQuestion,
  type SpeakingJudgement,
  skipAfterAiRest,
} from "@/core/speaking/judge";

type AppLesson = LessonOf["reading" | "writing" | "speaking"];

// ── 자리 ──

/** 활동 번호(1부터)의 자리. 가르치는 수업이 아니거나 번호가 목록 밖이면 undefined. */
export function teachSlotAt(
  activities: readonly Activity[],
  no: number,
): TeachSlot | undefined {
  const activity = activities[no - 1];
  if (!activity || !isTeachActivities(activities)) return undefined;
  return TEACH_SLOT_OF[activity.kind];
}

/** 그 자리의 첫 활동 번호(혼자 해 보기 첫 화면 한 줄 자리). 가르치는 수업이 아니거나 그 자리가 없으면 undefined. */
export function firstActivityOfSlot(
  activities: readonly Activity[],
  slot: TeachSlot,
): number | undefined {
  if (!isTeachActivities(activities)) return undefined;
  const index = activities.findIndex((a) => TEACH_SLOT_OF[a.kind] === slot);
  return index < 0 ? undefined : index + 1;
}

// ── 여는 차례(마-2) ──

/** 세션을 열 때 지금 보일 화면: 막힘(말하기 마이크 못 씀 포함) · 쉼 · 선생님 고르기 · 수업 활동. */
export type OpeningScreen = "blocked" | "resting" | "choose-teacher" | "lesson";

/**
 * 세 영역 세션의 여는 차례(델타 spec 설계 4 [L3 · C177] · 정본 AC-3i): 막힘 → 쉼 → '선생님을 골라요' → 수업(오늘 배울 것부터).
 * 고르기는 선생님이 나오는 수업(teaching 이 있음 — 정한 것 1)이고 집에 고른 선생님이 없을 때뿐이며, 보일 선생님이 없으면 묻지 않는다
 * (막다른 화면을 만들지 않음 — 기본 초상으로 간다). 이미 골랐으면 묻지 않는다. 세션 상태(활동 · 시도)와는 따로다(고르기는 활동이 아님).
 */
export function openingScreenOf(input: {
  blocked: boolean;
  resting: boolean;
  teaching: {
    teacher: unknown;
    teacherChoices: readonly unknown[];
  } | null;
}): OpeningScreen {
  if (input.blocked) return "blocked";
  if (input.resting) return "resting";
  const { teaching } = input;
  if (
    teaching &&
    teaching.teacher === null &&
    teaching.teacherChoices.length > 0
  )
    return "choose-teacher";
  return "lesson";
}

// ── 짝 고르기(L-34) ──

/** 화면 자료의 짝(서버 값): 낼 짝 · 끝난 것으로 볼 짝 · 상한 · 서버가 센 혼자 첫 시도 결과(활동 번호 → 결과). */
export type ServerSpares = SpareChoice & {
  cap: number;
  outcomes: readonly (readonly [number, SoloOutcome])[];
};

/**
 * 이 기기의 낼 짝(L-34 '서버가 센 혼자 첫 시도 결과를 화면 자료에 실어 합친다'): 서버 결과 위에 이 기기 첫 끝 시도(attempts — 대기열에 남은 시도와
 * 이 화면에서 낸 시도, 낸 차례대로)의 결과를 빈 자리에만 더해 sparesToShow 로 고른다. 서버가 이미 센 활동은 서버 값이 이긴다.
 */
export function spareChoiceOnDevice(input: {
  activities: readonly Activity[];
  lesson: AppLesson;
  server: ServerSpares;
  attempts: readonly { activityNo: number; input: unknown }[];
  ctx: OutcomeContext;
}): SpareChoice {
  const outcomes = soloOutcomesOf(
    input.activities,
    input.lesson,
    firstFinalsOf(input.attempts),
    input.ctx,
  );
  for (const [no, outcome] of input.server.outcomes) outcomes.set(no, outcome);
  return sparesToShow({
    activities: input.activities,
    outcomes,
    cap: input.server.cap,
  });
}

/**
 * 진행 막대에서 뺄 활동(plan 정한 것 3 · 위험 9 '진행 막대는 낸 짝만 센다'): 혼자 해 보기를 다 끝낸 뒤의 내지 않을 짝(skip — 맞힌 문항 · U 문항 ·
 * 상한 넘음). 혼자 해 보기 도중에는 낼 짝을 아직 모르고 skip 에 고르지 않은 짝이 들어 있어 빼지 않는다(칸은 '아직'으로 남음).
 */
export function progressHiddenOf(
  activities: readonly Activity[],
  finals: ReadonlySet<number>,
  skip: readonly number[],
): Set<number> {
  const soloDone = activities.every(
    (a, i) => TEACH_SLOT_OF[a.kind] !== "solo" || finals.has(i + 1),
  );
  return soloDone ? new Set(skip) : new Set();
}

// ── 무음 모드 줄 ──

/** 무음 모드 줄을 더하는 '소리가 안 나와서 글로 봐요' 횟수(UI · UX 설계 6 · 라-2 브리프 '두 번이면'). */
export const SILENT_LINE_FROM_NOTICE = 2;

/**
 * 한 세션의 선생님 줄 안내 셈. silent 는 무음 모드 줄을 지금 보이는가(아이패드 사파리인지는 부르는 쪽이 본다), shown 은 이 세션에서 이미
 * 더했는가(설계 10 '한 번 더한다' — 세션에 한 번).
 */
export type TeachNotices = { count: number; silent: boolean; shown: boolean };
export const TEACH_NOTICES_START: TeachNotices = {
  count: 0,
  silent: false,
  shown: false,
};

/**
 * 선생님 줄 하나가 멈춘 뒤(onLineEnd({ notice })): 안내였으면 센다. 두 번째 안내에서 무음 모드 줄을 한 번 더하고, 켜진 동안의 안내는 그대로
 * 둔다. 소리가 난 줄이 끝나면 거두며, 거둔 뒤의 안내(세 번째 …)에는 다시 더하지 않는다.
 */
export function teachNoticesAfter(
  state: TeachNotices,
  end: { notice: boolean },
): TeachNotices {
  if (!end.notice) return { ...state, silent: false };
  const count = state.count + 1;
  const silent =
    state.silent || (!state.shown && count >= SILENT_LINE_FROM_NOTICE);
  return { count, silent, shown: state.shown || silent };
}

// ── 읽기 도움(설계 9) ──

/** 시도 꼴 aid(attempt.ts ReadingAidSchema 와 같은 꼴). */
export type ReadingAid = { readAloud?: true; gloss?: string[] };
/** 글마다의 도움(열쇠: 지문 PASSAGE_AID_KEY · 짝 글 spareAidKey(활동 번호)). */
export type ReadingAids = Record<string, ReadingAid>;
export const PASSAGE_AID_KEY = "passage";
export const spareAidKey = (activityNo: number): string =>
  `spare:${activityNo}`;

/** 그 글에서 도움 하나를 썼다(읽어 주기 누름 · 뜻을 연 낱말 원형 — 같은 낱말은 한 번). */
export function aidUsed(
  aids: ReadingAids,
  key: string,
  use: { readAloud: true } | { gloss: string },
): ReadingAids {
  const before = aids[key] ?? {};
  if ("readAloud" in use)
    return { ...aids, [key]: { ...before, readAloud: true } };
  const gloss = before.gloss ?? [];
  if (gloss.includes(use.gloss)) return aids;
  return { ...aids, [key]: { ...before, gloss: [...gloss, use.gloss] } };
}

/** 그 글의 도움(쓴 것이 없으면 undefined — 시도 꼴에 aid 칸을 두지 않는다). */
export function aidOf(aids: ReadingAids, key: string): ReadingAid | undefined {
  const aid = aids[key];
  if (!aid) return undefined;
  const out: ReadingAid = {
    ...(aid.readAloud ? { readAloud: true as const } : {}),
    ...(aid.gloss && aid.gloss.length > 0 ? { gloss: [...aid.gloss] } : {}),
  };
  return Object.keys(out).length > 0 ? out : undefined;
}

/** 기기 저장소에서 읽은 값(모르는 꼴은 버림). */
export function readingAidsFrom(raw: unknown): ReadingAids {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: ReadingAids = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object") continue;
    const v = value as { readAloud?: unknown; gloss?: unknown };
    out[key] = {
      ...(v.readAloud === true ? { readAloud: true as const } : {}),
      ...(Array.isArray(v.gloss)
        ? { gloss: v.gloss.filter((g): g is string => typeof g === "string") }
        : {}),
    };
  }
  return out;
}

// ── 쓰기 색 칸(표본 W10) ──

/** 쓰기 칩 자리(정본 밖 문구 표 칩 이름 — 무엇 · is · 어때요 · 마침표). */
export type AssembleRole = Extract<
  TeachChipRole,
  "thing" | "is" | "how" | "end"
>;

/**
 * 정답 문장의 카드 차례마다 칩 자리('무엇이 어때요' 꼴 — is 카드 앞은 무엇, is, 뒤는 어때요, 문장 부호는 마침표). is 카드가 없거나 맨 앞 ·
 * 맨 끝이면 이 꼴이 아니라 undefined(색 칸 없이 같은 문제 다시 — 대문자 단추 반짝임만).
 */
export function assembleRolesOf(sentence: string): AssembleRole[] | undefined {
  const cards = cardTokensOf(sentence);
  const isAt = cards.findIndex((c) => c.toLowerCase() === "is");
  const lastWord = cards.findLastIndex((c) => /[A-Za-z]/.test(c));
  if (isAt <= 0 || isAt >= lastWord) return undefined;
  return cards.map((card, i) => {
    if (!/[A-Za-z]/.test(card)) return "end";
    if (i < isAt) return "thing";
    if (i === isAt) return "is";
    return "how";
  });
}

// ── 같이 해 보기 ──

/** 같이 해 보기 시도 하나(시도 꼴 together.tries 의 칸). */
export type TogetherTry = Extract<
  AttemptInput,
  { kind: "together" }
>["tries"][number];

/** 같이 해 보기 시도 하나가 맞는가(공용 togetherOutcomeOf 에 그 시도 하나만 넣는다 — 맞출 칸이 없는 시도(대문자 단추)는 맞음). */
export function togetherTryRight(
  activity: Extract<Activity, { kind: "together" }>,
  lesson: AppLesson,
  attempt: TogetherTry,
  ctx: OutcomeContext,
): boolean {
  return (
    togetherOutcomeOf(
      activity,
      lesson,
      {
        v: INPUT_VERSION,
        kind: "together",
        step: "final",
        index: activity.index,
        tries: [attempt],
      },
      ctx,
    ) === "correct"
  );
}

// ── 말하기(묶음 라-3 · 델타 spec 설계 1 '틀린 뒤 차례' 말하기 행 · 5 화면 표 · 10 'AI 쉬는 중') ──

/** 시드 끊는 자리 표시('Dan and Tess / come here.' 의 '/'). */
const CHUNK_MARK = "/";
const spaced = (text: string) => text.trim().replace(/\s+/g, " ");

/**
 * 끊어 들려줄 조각(시드 repeat.chunks 의 한 줄 — 따라 말하기 문장과 같은 차례). 끊는 자리가 없거나, 조각을 이은 글이 문장과 다르면(시드 어긋남)
 * 문장 하나 그대로다(낱말 따라 말하기는 chunks 가 없어 늘 하나 — 시드 규격 '낱말은 없음').
 */
export function chunksOf(text: string, line: string | undefined): string[] {
  if (line === undefined || !line.includes(CHUNK_MARK)) return [text];
  const pieces = line
    .split(CHUNK_MARK)
    .map((piece) => piece.trim())
    .filter((piece) => piece !== "");
  return pieces.length > 1 && spaced(pieces.join(" ")) === spaced(text)
    ? pieces
    : [text];
}

/**
 * 따라 말하기의 가르치는 수업 단계: 묻기 · '왜'(첫 시도 결과 말이 '잘 말했어요'가 아님 — 앱 문구 '끊어서 다시 들어 봐요.') · 다시(지금 규칙 —
 * '한 번 더 말하기' 상한 없음, 점수는 가장 높은 일치율) · 짝 맞음 · 짝 틀림(바른 답을 들려주고 끝). 첫 시도가 '잘 말했어요'면 '왜' 없이 지금 규칙이다.
 */
export type RepeatTeachStage =
  | "ask"
  | "why"
  | "again"
  | "spare-right"
  | "spare-wrong";

export function repeatTeachStageOf(input: {
  mode: "solo" | "spare";
  heardCount: number;
  firstGood: boolean;
  retrying: boolean;
}): RepeatTeachStage {
  if (input.heardCount === 0) return "ask";
  if (input.mode === "spare")
    return input.firstGood ? "spare-right" : "spare-wrong";
  if (input.firstGood || input.retrying) return "again";
  return "why";
}

/**
 * 판정하는 질문 답의 단계(혼자 질문 · 질문 짝 — 앱 판정 · AI 판정 같은 화면): 이야기(가르치는 수업, 글자 없이 소리만) · 묻기 · 기다림(AI) ·
 * 보내지 못함(다시 보냄) · 맞음 · '왜'(혼자 · 가르치는 수업 · 시드 '왜'가 있음) · 같이 말해 볼까요(같은 문제 다시) · 짝 맞음 · 짝 틀림(바른 답을
 * 들려주고 끝) · 판정 없음(소리를 못 들은 답 · 건너뜀 — 결과 말 없이 다음). 판정 글자는 어느 단계에도 없다(AC-5d).
 */
export type JudgedQuestionStage =
  | "story"
  | "ask"
  | "waiting"
  | "failed"
  | "right"
  | "why"
  | "echo"
  | "spare-right"
  | "spare-wrong"
  | "unscored";

/** 질문 답의 판정 상태: 아직 · 맞음 · 맞음 아님(부분 · 다시) · 기다림 · 보내지 못함 · 판정 없음. */
export type QuestionVerdict =
  | "none"
  | "correct"
  | "wrong"
  | "pending"
  | "failed"
  | "unscored";

export function judgedQuestionStageOf(input: {
  /** 가르치는 수업이면 혼자 · 짝, 아니면 undefined(지금 화면 — 이야기 · '왜' 없음). */
  mode: "solo" | "spare" | undefined;
  /** 이야기 화면을 아직 지나지 않았나. */
  storyPending: boolean;
  verdict: QuestionVerdict;
  /** 시드 '왜' 한 줄이 있나. */
  why: boolean;
  /** '왜' 뒤 '한 번 더 말하기'를 눌렀나. */
  retrying: boolean;
}): JudgedQuestionStage {
  if (input.storyPending) return "story";
  switch (input.verdict) {
    case "none":
      return "ask";
    case "pending":
      return "waiting";
    case "failed":
      return "failed";
    case "unscored":
      return "unscored";
    case "correct":
      return input.mode === "spare" ? "spare-right" : "right";
    case "wrong":
      if (input.mode === "spare") return "spare-wrong";
      return input.mode === "solo" && input.why && !input.retrying
        ? "why"
        : "echo";
  }
}

/**
 * 듣기 이해 같은 문제 다시의 답 덩어리 빠르기(델타 spec 설계 1 듣기 이해 행 '답 덩어리를 천천히'): 그 단계 구간 빠르기(speech.rate.<구간>)에
 * speech.slow_rate_factor 를 곱한 값.
 */
export function slowRateOf(rate: number, factor: number): number {
  return rate * factor;
}

/**
 * 'AI 쉬는 중'에 건너뛸 혼자 질문(델타 spec 설계 10 · plan-p11c 값 2 · 4): from 차례부터 남은 AI 판정 혼자 질문 가운데 아직 끝 시도가 없는 것.
 * 그 앞 이야기 화면도 질문 활동 안이라 함께 건너뛴다. 질문 짝 · 같이 해 보기는 앱 판정이라 남는다(건너뛴 질문은 U 라 그 짝은 내지 않는다).
 */
export function aiRestSkipsOf(
  activities: readonly Activity[],
  finals: ReadonlySet<number>,
  from: number,
): number[] {
  return skipAfterAiRest(activities, from).filter((no) => !finals.has(no));
}

/**
 * 서버 액션이 저장한 AI 판정 혼자 질문 끝 시도의 기기 몫 사본(짝 고르기 입력 — 보내지 않음, L-34 '이 기기에서 낸 첫 끝 시도'). 판정 칸은
 * judgeSpeakingQuestion 에 서버가 돌려준 합친 판정을 AI 판정 자리로 넣어 다시 셈한다 — 의미 실패면 '다시', 묶음과 맞으면 맞음, 그 밖은 넣은
 * 판정 그대로라 서버 judge 의 final 과 같다(soloOutcomeOf 가 final 만 본다). 판정 없이 넘어간 시도(AI 실패 · 소리 없음)는 판정 칸 없이 U 다.
 */
export function savedQuestionInputOf(
  question: JudgeableQuestion,
  saved: {
    final: { heard: readonly string[] } & Record<string, unknown>;
    judgement?: SpeakingJudgement | undefined;
  },
  ctx: OutcomeContext | undefined,
): Record<string, unknown> {
  const transcript = saved.final.heard[0];
  const judge =
    saved.judgement !== undefined &&
    transcript !== undefined &&
    ctx !== undefined &&
    judgeableQuestion(question)
      ? judgeSpeakingQuestion(
          question,
          transcript,
          questionJudgeContextOf(ctx),
          saved.judgement,
        )
      : undefined;
  return {
    v: INPUT_VERSION,
    kind: "question",
    step: "final",
    ...saved.final,
    ...(judge ? { judge } : {}),
  };
}

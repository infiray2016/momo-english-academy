// 오늘 완료 · 이번 주 n일(4절 홈 표 '오늘 완료' 행 · 3.5 · AC-2a · AC-N7, plan-p10b 파일별 값 2 · 정할 것 ㄴ).
// DB · 시계를 가져오지 않는다. 학습일은 부르는 쪽이 learningDayOf(시각, app.timezone, app.day_start_hour) 로 센 글('YYYY-MM-DD')이고,
// 세션의 학습일은 끝낸 학습일(sessions.learning_day, C56 (1)) — 그래서 새벽 3시 50분에 끝낸 수업은 전날이다.

export type DoneSession = {
  kind:
    | "regular"
    | "remedial"
    | "practice"
    | "untried"
    | "retry"
    | "review"
    | "level_test"
    | "placement";
  status: "in_progress" | "completed" | "archived" | "aborted";
  /** 끝낸 학습일. 진행 중이면 비움. */
  learningDay: string | null;
};

/** 새 수업(정할 것 ㄴ — 정규 · 보강 · 연습 · 안 해 본 수업). 회화는 목표 턴에 닿아 끝낸 세션이 completed 로 온다(1-나). */
const NEW_LESSON_KINDS: ReadonlySet<DoneSession["kind"]> = new Set([
  "regular",
  "remedial",
  "practice",
  "untried",
]);
/** 할 수 있는 새 수업이 없는 날 켜는 것(다시 하기 · 복습). */
const FALLBACK_KINDS: ReadonlySet<DoneSession["kind"]> = new Set([
  "retry",
  "review",
]);

export type TodayDoneInput = {
  today: string;
  sessions: readonly DoneSession[];
  /** 그날 복습할 카드가 있는가(P12 전에는 거짓). */
  reviewDue: boolean;
  /** 그날 복습을 끝냈는가(P12 전에는 거짓). */
  reviewDoneToday: boolean;
  /** 그날 할 수 있는 새 수업이 없는가(부모 확인 대기 · 다음 단계 준비 중 · 졸업, 'AI 쉬는 중'은 1-나). */
  noNewLessonPossible: boolean;
};

/**
 * 오늘 완료(done)와 오늘 새 수업을 했는가(newLessonDone — 아니면 카드에 '오늘 아직이에요').
 * 켜짐: 단계 평가 세션 하나를 그날 끝냄 · 또는 새 수업이 없는 날이고 다시 하기 · 복습 하나를 끝냄 ·
 * 또는 새 수업 하나 이상을 끝냈고 (복습할 카드가 없거나 그날 복습을 끝냄).
 */
export function todayDone(input: TodayDoneInput): {
  done: boolean;
  newLessonDone: boolean;
} {
  const today = input.sessions.filter(
    (s) => s.status === "completed" && s.learningDay === input.today,
  );
  const newLessonDone = today.some((s) => NEW_LESSON_KINDS.has(s.kind));
  const levelTestDone = today.some((s) => s.kind === "level_test");
  const fallbackDone =
    input.noNewLessonPossible &&
    (input.reviewDoneToday || today.some((s) => FALLBACK_KINDS.has(s.kind)));
  const lessonDayDone =
    newLessonDone && (!input.reviewDue || input.reviewDoneToday);
  return {
    done: levelTestDone || fallbackDone || lessonDayDone,
    newLessonDone,
  };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** 주의 시작 요일(3.5 — 월요일). getUTCDay 의 1. */
const WEEK_START_DAY = 1;
const DAYS_PER_WEEK = 7;

/** 'YYYY-MM-DD' → 그 날의 UTC 자정 ms(달력 날짜 셈용, 시각이 아님). */
function dayMs(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1);
}

/** 그 학습일이 든 주(월요일 시작)의 월요일 'YYYY-MM-DD'. */
export function weekStartOf(day: string): string {
  const ms = dayMs(day);
  const dow = new Date(ms).getUTCDay();
  const back = (dow - WEEK_START_DAY + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  return new Date(ms - back * MS_PER_DAY).toISOString().slice(0, 10);
}

/** 오늘이 든 주의 월요일부터 오늘까지 서로 다른 학습일 수(그 영역에서 세션(복습 포함)을 하나 이상 끝낸 날). */
export function thisWeekDays(input: {
  today: string;
  learningDays: readonly string[];
}): number {
  const start = weekStartOf(input.today);
  const days = new Set(
    input.learningDays.filter((d) => d >= start && d <= input.today),
  );
  return days.size;
}

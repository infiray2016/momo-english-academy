// 수업 목록 상태 · 세션 시작 재판정(4절 수업 목록 표 · 3.2 수업 목록 · 다시 하기 · 안 해 본 수업 · 연습 수업 · AC-2b · AC-2d,
// plan-p10b 파일별 값 1 · 위험 3). DB · 시계를 가져오지 않는다 — 회차 시작 시각 · 세션은 부르는 쪽(서버)이 넘긴다.
// 목록(lessonListState)과 재판정(judgeLessonStart)은 같은 ListInput 과 같은 도우미를 써서 '화면에 보인 것 = 열리는 것'이다.
// P10 의 서버는 gate 의 수업 수 · 학습일과 state 만 채우고 feedbackReady · levelTest · remedialIssued · practice · reviewDue ·
// gate.wordsShort · scoreShort 는 빈 값이다(P11 · P12 가 채운다).
import type { Area } from "@/core/seed/structure";

export type LessonKindRef = "assigned" | "reinforce" | "alphabet" | "remedial";
export type LessonRef = { unit: number; kind: LessonKindRef; lessonNo: number };
export type LessonCellView = LessonRef & {
  lessonId: string;
  variant: number;
  title: string;
  newWords: string[];
  unitWords: string[];
  revision: number;
  correction: number;
};
export type SessionKind =
  | "regular"
  | "remedial"
  | "practice"
  | "untried"
  | "retry"
  | "review"
  | "level_test"
  | "placement";
/** 이 영역 · 이 단계의 세션(서버가 고름). */
export type SessionLite = {
  id: string;
  status: "in_progress" | "completed" | "archived" | "aborted";
  kind: SessionKind;
  ref?: LessonRef;
  variant?: number;
  seedRevision?: number;
  startedAt: Date;
  /** 끝낸 시각('이 회차에서 끝냄'의 경계 — 홈과 같게 끝낸 시각으로, 검토 review-p10-4-code M-3). */
  completedAt?: Date | null;
  /** 세션의 단원(수업 칸이 없는 세션도 단원 수에 쓴다). */
  unit?: number | null;
  learningDay?: string | null;
};
export type UnitGate = {
  remainingLessons: number;
  remainingDays: number;
  wordsShort?: boolean;
  scoreShort?: boolean;
};
export type ListState =
  | "normal"
  | "practice"
  | "parent_check"
  | "next_level_pending"
  | "graduated";

export type ListInput = {
  area: Area;
  level: number;
  unit: number;
  /** 지금 단원 회차의 시작 시각(unit_progress.started_at) — '이 회차에서 끝냄'을 가른다. */
  roundStartedAt: Date;
  /**
   * 지금 단원 회차를 통과했는가(unit_progress.passed_at — 단계 평가 대기 · 다음 단계 준비 중 · 졸업).
   * 통과했으면 지금 단원의 수업도 지난 단원처럼 끝낸 것은 다시 하기, 안 한 것은 안 해 본 수업이다(3.2, 검토 I-1).
   */
  currentPassed: boolean;
  unitsPassed: number[];
  /** 단원 번호 → 프로필 변형으로 고른 수업 칸(서버가 readLessonsOfUnit 로). */
  lessonsByUnit: Record<number, LessonCellView[]>;
  sessions: SessionLite[];
  gate: UnitGate;
  state: ListState;
  feedbackReady: LessonRef[];
  levelTest?: { ready: boolean };
  remedialIssued: LessonRef[];
  practice: LessonCellView[];
  reviewDue: boolean;
  unitsPerLevel: number;
};

export type LessonItem = {
  ref: LessonRef;
  lessonId: string;
  title: string;
  done: boolean;
  inProgress: boolean;
  remedial?: true;
  /** 통과한 지금 단원의 안 한 수업(3.2 '안 해 본 수업'). */
  untried?: true;
};
export type TopItem =
  | { kind: "resume"; sessionId: string; ref?: LessonRef }
  | { kind: "feedback"; ref: LessonRef }
  | { kind: "level_test" };
export type HereStart =
  | { kind: "resume"; sessionId: string }
  | { kind: "feedback"; ref: LessonRef }
  | { kind: "level_test" }
  | { kind: "lesson"; ref: LessonRef }
  | { kind: "review" }
  | { kind: "practice"; ref: LessonRef; variant: number };
export type LockLine =
  | { kind: "lessons"; n: number }
  | { kind: "days"; n: number }
  | { kind: "words" }
  | { kind: "score" };

export type ListView = {
  band: { level: number; unit: number };
  /** 지금 단원 묶음(앞줄 보강 · 배정 · 알파벳, 뒷줄 다지기). 부모 확인 대기면 비움(안내가 그 자리). */
  current: { front: LessonItem[]; back: LessonItem[] } | null;
  top: TopItem[];
  hereStart: HereStart | null;
  /** 잠긴 다음 단원 한 장(지금 단원이 마지막이면 비움, 정할 것 ㅎ). */
  lockedNext: { unit: number; line: LockLine | null } | null;
  /** '지난 수업 다시 하기' 한 장이 있는가. */
  past: boolean;
  practice: LessonItem[];
  notice: "parent_check" | "next_level_pending" | null;
};

/** 정규 수업으로 끝낸 것으로 보는 세션 종류(그 칸을 '해 봤다'). */
const TRIED_KINDS: ReadonlySet<SessionKind> = new Set([
  "regular",
  "retry",
  "untried",
]);
/** 지금 단원 새 수업 후보 · 잠긴 단원 한 줄을 두지 않는 상태(4절 — 부모 확인 대기 · 다음 단계 준비 중 · 졸업). */
const PAUSED_STATES: ReadonlySet<ListState> = new Set([
  "parent_check",
  "next_level_pending",
  "graduated",
]);

const sameRef = (a: LessonRef | undefined, b: LessonRef): boolean =>
  a !== undefined &&
  a.unit === b.unit &&
  a.kind === b.kind &&
  a.lessonNo === b.lessonNo;

const refOf = (c: LessonCellView): LessonRef => ({
  unit: c.unit,
  kind: c.kind,
  lessonNo: c.lessonNo,
});

/** 진행 중 세션(배치 · 단계 평가 밖 — 수업 세션). */
function inProgressLesson(input: ListInput): SessionLite | undefined {
  return input.sessions.find(
    (s) => s.status === "in_progress" && s.ref !== undefined,
  );
}

/** 끝낸 시각(없으면 시작 시각)이 회차 시작 뒤인가. */
const inRound = (s: SessionLite, roundStartedAt: Date): boolean =>
  (s.completedAt ?? s.startedAt) >= roundStartedAt;

/**
 * 이 칸을 끝낸 적이 있는가 — 통과 전 지금 단원은 이 회차에서(끝낸 시각 ≥ 회차 시작), 지난 단원 · 통과한 지금 단원은 언제든.
 */
function triedRef(input: ListInput, ref: LessonRef): boolean {
  const sinceRound = ref.unit === input.unit && !input.currentPassed;
  return input.sessions.some(
    (s) =>
      s.status === "completed" &&
      TRIED_KINDS.has(s.kind) &&
      sameRef(s.ref, ref) &&
      (!sinceRound || inRound(s, input.roundStartedAt)),
  );
}

function issued(input: ListInput, ref: LessonRef): boolean {
  return input.remedialIssued.some((r) => sameRef(r, ref));
}

function remedialDone(input: ListInput, ref: LessonRef): boolean {
  return input.sessions.some(
    (s) =>
      s.status === "completed" &&
      s.kind === "remedial" &&
      sameRef(s.ref, ref) &&
      inRound(s, input.roundStartedAt),
  );
}

function itemOf(input: ListInput, c: LessonCellView): LessonItem {
  const ref = refOf(c);
  const going = inProgressLesson(input);
  const remedial = c.kind === "remedial";
  const done = remedial ? remedialDone(input, ref) : triedRef(input, ref);
  const untried =
    !remedial && !done && input.currentPassed && ref.unit === input.unit;
  return {
    ref,
    lessonId: c.lessonId,
    title: c.title,
    done,
    inProgress: sameRef(going?.ref, ref),
    ...(remedial ? { remedial: true as const } : {}),
    ...(untried ? { untried: true as const } : {}),
  };
}

const byNo = (a: LessonCellView, b: LessonCellView) => a.lessonNo - b.lessonNo;

/** 잠긴 다음 단원 한 줄: 수업 수 → 학습일 → 단어 → 성적 가운데 맨 앞 하나(4절). */
function lockLine(gate: UnitGate): LockLine | null {
  if (gate.remainingLessons > 0)
    return { kind: "lessons", n: gate.remainingLessons };
  if (gate.remainingDays > 0) return { kind: "days", n: gate.remainingDays };
  if (gate.wordsShort) return { kind: "words" };
  if (gate.scoreShort) return { kind: "score" };
  return null;
}

/** 수업 목록 상태(4절 수업 목록 표 · 3.2). */
export function lessonListState(input: ListInput): ListView {
  const cells = input.lessonsByUnit[input.unit] ?? [];
  const remedials = cells
    .filter((c) => c.kind === "remedial" && issued(input, refOf(c)))
    .sort(byNo);
  const regularFront = cells
    .filter((c) => c.kind === "assigned" || c.kind === "alphabet")
    .sort(byNo);
  const back = cells.filter((c) => c.kind === "reinforce").sort(byNo);
  const frontItems = [...remedials, ...regularFront].map((c) =>
    itemOf(input, c),
  );
  const backItems = back.map((c) => itemOf(input, c));

  const going = inProgressLesson(input);
  const top: TopItem[] = [
    ...(going
      ? [
          {
            kind: "resume" as const,
            sessionId: going.id,
            ...(going.ref ? { ref: going.ref } : {}),
          },
        ]
      : []),
    ...input.feedbackReady.map((ref) => ({ kind: "feedback" as const, ref })),
    ...(input.levelTest?.ready ? [{ kind: "level_test" as const }] : []),
  ];

  // 부모 확인 대기 · 다음 단계 준비 중 · 졸업 · 지금 단원 통과(단계 평가 대기)에는 지금 단원의 새 수업 후보가 없다 —
  // '여기부터 해요'는 하던 수업 · 첨삭 · 단계 평가만, 잠긴 단원 한 줄도 없다(열 조건을 부모 · 다음 단계가 정함, 컨트롤러 해석)
  const paused = PAUSED_STATES.has(input.state) || input.currentPassed;
  const practiceItems = input.practice.map((c) => itemOf(input, c));
  let hereStart: HereStart | null = null;
  if (going) hereStart = { kind: "resume", sessionId: going.id };
  else if (input.feedbackReady[0])
    hereStart = { kind: "feedback", ref: input.feedbackReady[0] };
  else if (input.levelTest?.ready) hereStart = { kind: "level_test" };
  else if (!paused) {
    const next =
      frontItems.find((i) => i.remedial && !i.done) ??
      frontItems.find((i) => !i.remedial && !i.done) ??
      backItems.find((i) => !i.done);
    if (next) hereStart = { kind: "lesson", ref: next.ref };
    else if (input.state === "practice" && input.reviewDue)
      hereStart = { kind: "review" };
    else {
      const practice = input.practice.find((_c, i) => !practiceItems[i]?.done);
      if (practice)
        hereStart = {
          kind: "practice",
          ref: refOf(practice),
          variant: practice.variant,
        };
    }
  }

  return {
    band: { level: input.level, unit: input.unit },
    current:
      input.state === "parent_check"
        ? null
        : { front: frontItems, back: backItems },
    top,
    hereStart,
    lockedNext:
      input.unit < input.unitsPerLevel
        ? {
            unit: input.unit + 1,
            // 단어 익히기 상태는 안내가 따로 있어 한 줄을 다시 쓰지 않는다(4절 단어 익히기 행, 검토 M-2)
            line:
              paused || input.state === "practice"
                ? null
                : lockLine(input.gate),
          }
        : null,
    past: input.unitsPassed.length > 0,
    practice: practiceItems,
    notice:
      input.state === "parent_check" || input.state === "next_level_pending"
        ? input.state
        : null,
  };
}

export type PastItem = {
  ref: LessonRef;
  lessonId: string;
  title: string;
  mark: "retry" | "untried";
};

/** 지난 단원의 수업(배정 · 알파벳 · 다지기, 번호 차례): 끝낸 적 있음 retry · 없음 untried(3.2 '안 해 본 수업'). */
export function pastUnits(input: ListInput, unit: number): PastItem[] {
  const cells = (input.lessonsByUnit[unit] ?? [])
    .filter((c) => c.kind !== "remedial")
    .sort(byNo);
  return cells.map((c) => ({
    ref: refOf(c),
    lessonId: c.lessonId,
    title: c.title,
    mark: triedRef(input, refOf(c)) ? "retry" : "untried",
  }));
}

export type StartJudgement =
  | {
      ok: true;
      kind: "regular" | "retry" | "untried" | "remedial" | "practice";
      variantRule: "profile" | "first_session";
      /** retry 의 처음 변형(그 칸을 처음 끝낸 세션의 변형). */
      firstVariant?: number;
      /** 그 칸을 처음 끝낸 세션의 시드 개정(retry 의 판 고르기). */
      firstRevision?: number;
      resume?: string;
      abort?: string;
    }
  | {
      ok: false;
      reason:
        | "not_placed"
        | "beyond_seed"
        | "other_level"
        | "locked_unit"
        | "not_issued"
        | "paused"
        | "unknown";
    };

/**
 * 세션 시작 재판정(plan-p10b 값 1). 거부: 배치 전 · 시드 범위 밖 · 다른 단계 · 지금 단원보다 뒤 · 발급 안 된 보강 · 연습 ·
 * 통과 전 지금 단원의 새 수업인데 부모 확인 대기('paused' — plan 의 까닭 목록에 더함) · 없는 칸.
 * 통과한 지금 단원은 지난 단원처럼 끝낸 것 retry · 안 한 것 untried(3.2).
 * 진행 세션과 같은 칸이면 resume, 다른 진행 세션이 있으면 abort(부르는 쪽이 확인을 받았을 때만 닫는다).
 */
export function judgeLessonStart(
  input: ListInput,
  chosen: {
    level: number;
    ref: LessonRef;
    variant?: number;
    practice?: boolean;
  },
  ctx: { seedThrough: number; placed: boolean },
): StartJudgement {
  if (!ctx.placed) return { ok: false, reason: "not_placed" };
  if (chosen.level > ctx.seedThrough)
    return { ok: false, reason: "beyond_seed" };
  if (chosen.level !== input.level) return { ok: false, reason: "other_level" };
  const { ref } = chosen;
  const isCurrent = ref.unit === input.unit;
  if (ref.unit > input.unit) return { ok: false, reason: "locked_unit" };
  if (!isCurrent && !input.unitsPassed.includes(ref.unit))
    return { ok: false, reason: "locked_unit" };
  const exists = (input.lessonsByUnit[ref.unit] ?? []).some((c) =>
    sameRef(refOf(c), ref),
  );
  if (!exists) return { ok: false, reason: "unknown" };

  let kind: Extract<StartJudgement, { ok: true }>["kind"];
  if (chosen.practice) {
    const offered =
      isCurrent &&
      input.state === "practice" &&
      input.practice.some(
        (c) =>
          sameRef(refOf(c), ref) &&
          (chosen.variant === undefined || c.variant === chosen.variant),
      );
    if (!offered) return { ok: false, reason: "not_issued" };
    kind = "practice";
  } else if (ref.kind === "remedial") {
    if (!isCurrent || !issued(input, ref))
      return { ok: false, reason: "not_issued" };
    kind = "remedial";
  } else if (triedRef(input, ref)) {
    kind = "retry";
  } else if (isCurrent && !input.currentPassed) {
    // 안전망: 부모 확인 대기(통과 전)에는 새 정규 수업을 열지 않는다(목록도 묶음을 숨김)
    if (input.state === "parent_check") return { ok: false, reason: "paused" };
    kind = "regular";
  } else {
    kind = "untried";
  }

  const going = inProgressLesson(input);
  const first = input.sessions
    .filter(
      (s) =>
        s.status === "completed" &&
        TRIED_KINDS.has(s.kind) &&
        sameRef(s.ref, ref),
    )
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())[0];
  return {
    ok: true,
    kind,
    variantRule: kind === "retry" ? "first_session" : "profile",
    ...(kind === "retry" && first?.variant !== undefined
      ? { firstVariant: first.variant }
      : {}),
    ...(kind === "retry" && first?.seedRevision !== undefined
      ? { firstRevision: first.seedRevision }
      : {}),
    ...(going && sameRef(going.ref, ref) ? { resume: going.id } : {}),
    ...(going && !sameRef(going.ref, ref) ? { abort: going.id } : {}),
  };
}

// ── 잠긴 다음 단원 수(plan-p10b 값 1 끝 문단 — 서버가 부르고 단위 시험이 규칙을 하나씩 본다, 검토 M-1) ──

/** 쓰기 6단계부터는 최소 수업 수를 level_specs frame.minLessons 에서 읽는다(3.2). */
export const WRITING_FRAME_FROM = 6;
/** 단원 학습일로 세는 세션(12절 unit.min_days — 정규 · 보강 · 연습 · 다시 하기). */
const DAY_KINDS: ReadonlySet<SessionKind> = new Set([
  "regular",
  "remedial",
  "practice",
  "retry",
]);

/** 최소 수업 수 = max(배정 수업 수, 복사본 unit.min_lessons — 쓰기 6단계부터 frame.minLessons). */
export function minLessonsOf(input: {
  area: Area;
  level: number;
  assignedCount: number;
  snapshotMinLessons: number;
  frameMinLessons?: number;
}): number {
  const base =
    input.area === "writing" &&
    input.level >= WRITING_FRAME_FROM &&
    input.frameMinLessons !== undefined
      ? input.frameMinLessons
      : input.snapshotMinLessons;
  return Math.max(input.assignedCount, base);
}

/**
 * 잠긴 다음 단원 수: 남은 수업 = max(0, 최소 수업 수 − 이 회차에서 끝낸 정규 수업 수(다시 하기 · 보강 · 연습 아님)),
 * 남은 학습일 = max(0, unit.min_days − 이 회차에서 정규 · 보강 · 연습 · 다시 하기를 끝낸 서로 다른 학습일 수).
 * '이 회차'는 끝낸 시각 ≥ 회차 시작. 단어 · 성적 조건은 P12(정할 것 ㅇ).
 */
export function unitGateOf(input: {
  unit: number;
  roundStartedAt: Date;
  minLessons: number;
  minDays: number;
  sessions: readonly SessionLite[];
}): UnitGate {
  const done = input.sessions.filter(
    (s) =>
      s.status === "completed" &&
      (s.unit ?? s.ref?.unit) === input.unit &&
      inRound(s, input.roundStartedAt),
  );
  const regular = done.filter((s) => s.kind === "regular").length;
  const days = new Set(
    done
      .filter((s) => DAY_KINDS.has(s.kind))
      .flatMap((s) => (s.learningDay ? [s.learningDay] : [])),
  );
  return {
    remainingLessons: Math.max(0, input.minLessons - regular),
    remainingDays: Math.max(0, input.minDays - days.size),
  };
}

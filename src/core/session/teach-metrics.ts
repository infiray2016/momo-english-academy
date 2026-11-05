// 수업 설계 지표(델타 spec 2026-10-29 가르치고 배우는 수업 FR-10 · 설계 8 '수업 설계 지표', plan 아 · 정본 15절 AC-22o). DB · 시계 없는
// 순수 함수다. 세션 · 시도 기록(시도 꼴 판 2)에서 스스로 해냄 · 혼자 첫 시도 정답률(문항별) · 같이 해 보기 첫 시도 정답률 · 자리별 걸린
// 시간을 낸다. 프리뷰 첫 주 보고 · 사용 시험 보고(scripts/teach-metrics.ts)에만 싣고 아이 · 부모 화면에는 보이지 않는다.
// '첫 시도'는 활동마다 가장 먼저 저장된 끝 시도(attempted_at 차례, 서버 firstFinalInputs 와 같은 결)의 첫 시도다. U(건너뜀 · 'AI 쉬는 중'
// · 소리 없음 · 판정 없는 AI 질문)는 비율의 분모에서 빼고 unscored 로 따로 센다(평가 spec validity 와 같은 결). 혼자 문항의 맞음 ·
// 틀림 · U 는 짝 고르기와 같은 soloOutcomeOf 로 정한다.
import type { LessonOf } from "@/core/seed/schema/lesson";
import {
  type AttemptInput,
  inputFitsActivity,
  type OutcomeContext,
  parseAttemptInput,
  type SoloOutcome,
  soloOutcomeOf,
} from "@/core/session/attempt";
import type { Activity, SpareBase } from "@/core/session/preview";
// 짝 · 같이 해 보기 첫 시도 판정은 공용 순수 함수(묶음 다 · 아 검토 M1 — 되짚기도 같은 함수)
import {
  spareOutcomeOf,
  togetherOutcomeOf,
} from "@/core/session/spare-outcome";
import { soloActivityNoOf } from "@/core/session/spares";

export { spareOutcomeOf, togetherOutcomeOf };

/** 밀리초 → 초(단위 값). */
const MS_PER_SECOND = 1000;

type AppLesson = LessonOf["reading" | "writing" | "speaking"];
type TeachArea = "reading" | "writing" | "speaking";

/**
 * 시간을 재는 자리(설계 5 위 띠 자리 이름 · 12절 lesson.slot_seconds_max.<자리>). 되짚기(recap)는 결과 화면이라 시도 기록이 없어
 * 여기서 재지 않는다.
 */
export const TEACH_SLOTS = [
  "today",
  "show",
  "together",
  "solo",
  "spare",
] as const;
export type TeachSlot = (typeof TEACH_SLOTS)[number];

/** 활동의 자리: 오늘 배울 것 · 보여 주기(새 단어 · 본보기) · 같이 해 보기 · 짝, 나머지(지금 차례의 과제)는 혼자 해 보기. */
export function slotOfActivity(activity: Activity): TeachSlot {
  switch (activity.kind) {
    case "today":
      return "today";
    case "preview":
    case "model":
      return "show";
    case "together":
      return "together";
    case "spare":
      return "spare";
    default:
      return "solo";
  }
}

/** 첫 시도를 세는 혼자 문항 종류(짝을 둘 수 있는 종류와 같다). */
const SOLO_ITEM_KINDS: ReadonlySet<Activity["kind"]> = new Set<SpareBase>([
  "reading-question",
  "writing-item",
  "question",
  "listening",
  "repeat-sentence",
  "repeat-word",
]);

/** 지표가 묶는 수업(식별 정보 없음 — id 는 묶음 열쇠로만 쓰고 보고에 내지 않는다). */
export type MetricLesson = {
  id: string;
  area: TeachArea;
  level: number;
  unit: number | null;
  lessonNo: number;
};
export type MetricAttempt = {
  activityNo: number;
  input: unknown;
  attemptedAt: Date;
};
/** 세션 하나: 수업 · 활동 차례(activitiesOf) · 시도 행 · 채점 문맥(서버 scoringOf 와 같은 값). 프로필은 번호만. */
export type MetricSession = {
  profileNo: number;
  lessonRef: MetricLesson;
  lesson: AppLesson;
  activities: readonly Activity[];
  startedAt: Date;
  attempts: readonly MetricAttempt[];
  ctx: OutcomeContext;
};

/** 맞힌 수 · 유효 수(맞음 + 틀림) · U 수 · 비율(유효 수가 0 이면 null). */
export type Ratio = {
  hits: number;
  total: number;
  unscored: number;
  rate: number | null;
};
/** 스스로 해냄: 짝을 첫 시도에 맞힘 / 짝 첫 시도가 유효한 틀린 혼자 문항. missing 은 짝 시도가 없는 틀린 혼자 문항(상한 · 아직 안 함). */
export type SelfDone = Ratio & { missing: number };
export type ItemMetric = {
  lesson: MetricLesson;
  slot: "together" | "solo" | "spare";
  /** 활동 종류(짝은 base 종류). */
  kind: string;
  index: number;
  first: Ratio;
};
export type TeachMetrics = {
  /** 센 가르치는 수업 세션 수. */
  sessions: number;
  /** 가르치는 수업이 아니라(오늘 배울 것 활동이 없음) 세지 않은 세션 수. */
  skippedSessions: number;
  selfDone: SelfDone;
  soloFirst: Ratio;
  togetherFirst: Ratio;
  /** 자리마다 세션별 걸린 초(그 자리에 시도가 있는 세션만). */
  slotSeconds: Record<TeachSlot, number[]>;
  /** 문항별 첫 시도(같이 해 보기 · 혼자 문항 · 짝, 세션을 넘어 합침 — 함정 문항도 여기서 읽는다). */
  items: ItemMetric[];
};

// ── 셈 그릇 ──

type Tally = { hits: number; misses: number; unscored: number };
const emptyTally = (): Tally => ({ hits: 0, misses: 0, unscored: 0 });
function add(t: Tally, outcome: SoloOutcome): void {
  if (outcome === "correct") t.hits += 1;
  else if (outcome === "wrong") t.misses += 1;
  else t.unscored += 1;
}
function ratioOf(t: Tally): Ratio {
  const total = t.hits + t.misses;
  return {
    hits: t.hits,
    total,
    unscored: t.unscored,
    rate: total === 0 ? null : t.hits / total,
  };
}

// ── 첫 끝 시도 ──

/** 활동 번호마다 가장 먼저 저장된, 그 활동에 맞는 끝 시도. */
function firstFinals(session: MetricSession): Map<number, AttemptInput> {
  const out = new Map<number, AttemptInput>();
  const sorted = [...session.attempts].sort(
    (a, b) => a.attemptedAt.getTime() - b.attemptedAt.getTime(),
  );
  for (const row of sorted) {
    if (out.has(row.activityNo)) continue;
    const activity = session.activities[row.activityNo - 1];
    const input = parseAttemptInput(row.input);
    if (
      activity &&
      input?.step === "final" &&
      inputFitsActivity(activity, input)
    )
      out.set(row.activityNo, input);
  }
  return out;
}

// ── 자리별 시간 ──

/** 자리마다 걸린 초: 앞 자리 끝 시도(그 자리 첫 시도보다 늦지 않은 것, 없으면 세션 시작)부터 그 자리 끝 시도까지. */
function slotSecondsOf(
  session: MetricSession,
): Partial<Record<TeachSlot, number>> {
  const out: Partial<Record<TeachSlot, number>> = {};
  for (const slot of TEACH_SLOTS) {
    const nos = new Set<number>();
    session.activities.forEach((a, i) => {
      if (slotOfActivity(a) === slot) nos.add(i + 1);
    });
    const times = session.attempts
      .filter((a) => nos.has(a.activityNo))
      .map((a) => a.attemptedAt.getTime());
    if (times.length === 0) continue;
    const firstNo = Math.min(...nos);
    const firstAt = Math.min(...times);
    const before = session.attempts
      .filter((a) => a.activityNo < firstNo)
      .map((a) => a.attemptedAt.getTime())
      .filter((t) => t <= firstAt);
    const start =
      before.length > 0 ? Math.max(...before) : session.startedAt.getTime();
    out[slot] = Math.max(0, (Math.max(...times) - start) / MS_PER_SECOND);
  }
  return out;
}

/** 초 목록의 수 · 가운데값 · 가장 긴 값(빈 목록은 null). */
export function secondsSummary(list: readonly number[]): {
  n: number;
  median: number | null;
  max: number | null;
} {
  if (list.length === 0) return { n: 0, median: null, max: null };
  const sorted = [...list].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1
      ? (sorted[mid] as number)
      : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
  return { n: sorted.length, median, max: sorted[sorted.length - 1] ?? null };
}

// ── 모으기 ──

const isTeachSession = (s: MetricSession): boolean =>
  s.activities.some((a) => a.kind === "today");

/** 세션 묶음의 지표 넷과 문항별 행. 가르치는 수업이 아닌 세션은 skippedSessions 로만 센다. */
export function teachMetricsOf(
  sessions: readonly MetricSession[],
): TeachMetrics {
  const selfDone = emptyTally();
  let missing = 0;
  const solo = emptyTally();
  const together = emptyTally();
  const slotSeconds = Object.fromEntries(
    TEACH_SLOTS.map((s) => [s, [] as number[]]),
  ) as Record<TeachSlot, number[]>;
  const items = new Map<
    string,
    Omit<ItemMetric, "first"> & { tally: Tally; order: number }
  >();
  let counted = 0;
  let skipped = 0;

  const itemTally = (
    session: MetricSession,
    slot: ItemMetric["slot"],
    kind: string,
    index: number,
    no: number,
  ): Tally => {
    const key = `${session.lessonRef.id}\u0000${slot}\u0000${kind}\u0000${index}`;
    let entry = items.get(key);
    if (!entry) {
      entry = {
        lesson: session.lessonRef,
        slot,
        kind,
        index,
        tally: emptyTally(),
        order: no,
      };
      items.set(key, entry);
    }
    return entry.tally;
  };

  for (const session of sessions) {
    if (!isTeachSession(session)) {
      skipped += 1;
      continue;
    }
    counted += 1;
    const finals = firstFinals(session);
    const soloOutcomes = new Map<number, SoloOutcome>();
    session.activities.forEach((activity, i) => {
      const no = i + 1;
      const input = finals.get(no);
      if (!input) return;
      if (activity.kind === "together") {
        const outcome = togetherOutcomeOf(
          activity,
          session.lesson,
          input,
          session.ctx,
        );
        add(together, outcome);
        add(
          itemTally(session, "together", "together", activity.index, no),
          outcome,
        );
      } else if (activity.kind === "spare") {
        const outcome = spareOutcomeOf(
          activity,
          session.lesson,
          input,
          session.ctx,
        );
        add(
          itemTally(session, "spare", activity.base, activity.index, no),
          outcome,
        );
      } else if (SOLO_ITEM_KINDS.has(activity.kind) && "index" in activity) {
        const outcome = soloOutcomeOf(
          activity,
          session.lesson,
          input,
          session.ctx,
        );
        soloOutcomes.set(no, outcome);
        add(solo, outcome);
        add(
          itemTally(session, "solo", activity.kind, activity.index, no),
          outcome,
        );
      }
    });
    // 스스로 해냄: 첫 시도에 틀린 혼자 문항마다 그 짝의 첫 시도
    for (const [soloNo, outcome] of soloOutcomes) {
      if (outcome !== "wrong") continue;
      const spareIndex = session.activities.findIndex(
        (a) =>
          a.kind === "spare" &&
          soloActivityNoOf(session.activities, a) === soloNo,
      );
      const spareActivity = session.activities[spareIndex];
      const input = finals.get(spareIndex + 1);
      if (spareActivity?.kind !== "spare" || !input) {
        missing += 1;
        continue;
      }
      add(
        selfDone,
        spareOutcomeOf(spareActivity, session.lesson, input, session.ctx),
      );
    }
    const seconds = slotSecondsOf(session);
    for (const slot of TEACH_SLOTS) {
      const value = seconds[slot];
      if (value !== undefined) slotSeconds[slot].push(value);
    }
  }

  return {
    sessions: counted,
    skippedSessions: skipped,
    selfDone: { ...ratioOf(selfDone), missing },
    soloFirst: ratioOf(solo),
    togetherFirst: ratioOf(together),
    slotSeconds,
    items: [...items.values()]
      .sort(
        (a, b) =>
          a.lesson.id.localeCompare(b.lesson.id) ||
          a.order - b.order ||
          a.index - b.index,
      )
      .map(({ tally, order: _order, ...rest }) => ({
        ...rest,
        first: ratioOf(tally),
      })),
  };
}

export type MetricGroupBy = "area" | "level" | "unit" | "lesson" | "profile";
export type MetricGroup = {
  by: MetricGroupBy;
  /** 묶음 열쇠(영어 · 숫자만 — 'reading 3-1 #1' · 'profile 2'). */
  key: string;
  /** 묶음 첫 세션의 수업 · 프로필 번호(보고가 이름을 짓는다). */
  lesson: MetricLesson;
  profileNo: number;
  metrics: TeachMetrics;
};

function groupKeyOf(session: MetricSession, by: MetricGroupBy): string {
  const { area, level, unit, lessonNo } = session.lessonRef;
  switch (by) {
    case "area":
      return area;
    case "level":
      return `${area} ${level}`;
    case "unit":
      return `${area} ${level}-${unit ?? "-"}`;
    case "lesson":
      return `${area} ${level}-${unit ?? "-"} #${lessonNo}`;
    case "profile":
      return `profile ${session.profileNo}`;
  }
}

/** 영역 · 단계 · 단원 · 수업 · 프로필 번호로 묶은 지표(묶음 열쇠 차례 — 영역은 읽기 · 쓰기 · 말하기 차례, 수는 크기 차례). */
export function teachMetricsBy(
  sessions: readonly MetricSession[],
  by: MetricGroupBy,
): MetricGroup[] {
  const groups = new Map<string, MetricSession[]>();
  for (const session of sessions) {
    const key = groupKeyOf(session, by);
    const list = groups.get(key);
    if (list) list.push(session);
    else groups.set(key, [session]);
  }
  const areaOrder: readonly TeachArea[] = ["reading", "writing", "speaking"];
  const rank = (s: MetricSession): number[] => [
    by === "profile" ? s.profileNo : 0,
    areaOrder.indexOf(s.lessonRef.area),
    s.lessonRef.level,
    s.lessonRef.unit ?? 0,
    s.lessonRef.lessonNo,
  ];
  return [...groups.entries()]
    .map(([key, list]) => ({ key, list, first: list[0] as MetricSession }))
    .sort((a, b) => {
      const ra = rank(a.first);
      const rb = rank(b.first);
      for (let i = 0; i < ra.length; i += 1) {
        const d = (ra[i] as number) - (rb[i] as number);
        if (d !== 0) return d;
      }
      return a.key.localeCompare(b.key);
    })
    .map(({ key, list, first }) => ({
      by,
      key,
      lesson: first.lessonRef,
      profileNo: first.profileNo,
      metrics: teachMetricsOf(list),
    }));
}

import "server-only";
// 수업 목록 자료(4절 수업 목록 표 · 3.2 · 5절 전이 · 8절 오래 멈춘 세션, plan-p10b 파일별 값 5 · 정할 것 ㄷ · ㅂ · ㅅ · ㅇ).
// 목록 요청 때 먼저 오래 멈춘 진행 세션을 중단으로 닫고(배치 평가는 닫지 않음), 트랙 · 단원 회차 · 수업 칸 · 이 단계 세션 ·
// 잠긴 다음 단원 수를 모아 순수 함수 lessonListState 로 넘긴다. 시각은 인자(now)로 받고 질의 SQL 안에 now() 를 쓰지 않는다.
// gate 의 단어 · 성적 조건과 단계 평가 · 보강 · 연습 · 복습은 P12 가 채운다(지금은 빈 값). 쓰기 6~12 첫 세션 · 첨삭 상태
// (writingDrafts · feedbackReady)는 P11b 차례 7 이 채운다(plan-p11b 값 11).
// 위 띠(UI · UX 묶음 3 · R-13): 단원 5칸 · 막대 재료는 band.ts(readBandFacts)가 모은다. 홈 회화 카드의 오늘 이야기 제목(4절 회화 카드 행)은
// 같은 입력 · 같은 함수(lessonListState → hereStartTitleOf)로 고른다 — 홈은 쓰지 않으므로 오래 멈춘 세션을 닫지 않고, 닫힐 세션을 빼고 본다.
import { and, eq, inArray, lt, ne } from "drizzle-orm";
import { z } from "zod";
import { learningDayOf } from "@/core/learning-day";
import {
  hereStartTitleOf,
  type LessonCellView,
  type LessonKindRef,
  type ListInput,
  type ListState,
  type ListView,
  lessonListState,
  minLessonsOf,
  type SessionLite,
  unitGateOf,
  WRITING_FRAME_FROM,
  type WritingDraft,
} from "@/core/lesson-list/state";
import { talkCardKindOf } from "@/core/seed/schema/talk";
import { type Area, UNITS_PER_LEVEL } from "@/core/seed/structure";
import { parseAttemptInput } from "@/core/session/attempt";
import { feedbackStateOf } from "@/core/writing/feedback";
import { lessons } from "@/db/schema/content";
import {
  attempts,
  profileTracks,
  sessions,
  unitProgress,
} from "@/db/schema/learning";
import { type DbOrTx, getDb } from "@/server/db";
import { readBandFacts } from "@/server/lesson-list/band";
import { type HouseholdProfile, readHouseholdProfile } from "@/server/profile";
import {
  type LessonRow,
  readLessonsOfUnit,
  readLevelSpec,
} from "@/server/seed/read";
import {
  appDayStartHourSchema,
  appTimezoneSchema,
  getSettings,
} from "@/server/settings";

const MS_PER_HOUR = 60 * 60 * 1000;
/** 부모 확인 대기 값(정할 것 ㅅ — P12 가 같은 값을 쓴다). */
const PARENT_CHECK_PENDING = "pending";
const MIN_LESSONS_KEY = "unit.min_lessons";
const MIN_DAYS_KEY = "unit.min_days";
const LESSON_LIST_KINDS: readonly LessonKindRef[] = [
  "assigned",
  "reinforce",
  "alphabet",
  "remedial",
];

const settingSchemas = {
  "session.resume_hours": z.number().positive(),
  "app.timezone": appTimezoneSchema,
  "app.day_start_hour": appDayStartHourSchema,
};

export type LessonListResult =
  | { kind: "no_profile" }
  | { kind: "placement" }
  | { kind: "list"; view: ListView; input: ListInput };

/** 오래 멈춘 세션의 경계(now − session.resume_hours): 이보다 일찍 시작한 진행 세션(배치 평가 아님)은 닫는다. */
async function staleCutoffOf(
  db: DbOrTx,
  profileId: string,
  now: Date,
): Promise<Date> {
  const s = await getSettings(settingSchemas, { db, profileId });
  return new Date(now.getTime() - s["session.resume_hours"] * MS_PER_HOUR);
}

/**
 * 오래 멈춘 세션 닫기(5절 전이 '진행 → 중단' · 8절): 그 프로필의 진행 세션 가운데 배치 평가가 아니고
 * started_at 이 now − session.resume_hours 보다 이른 것을 aborted 로, learning_day 는 지금 학습일로(정할 것 ㄷ).
 * 중단은 완료가 아니라 단원 횟수 · 성적 · 별에 들지 않는다. 닫은 수를 돌려준다.
 */
export async function closeStaleSessions({
  db = getDb(),
  profileId,
  now,
}: {
  db?: DbOrTx;
  profileId: string;
  now: Date;
}): Promise<number> {
  const s = await getSettings(settingSchemas, { db, profileId });
  const cutoff = new Date(
    now.getTime() - s["session.resume_hours"] * MS_PER_HOUR,
  );
  const closed = await db
    .update(sessions)
    .set({
      status: "aborted",
      learningDay: learningDayOf(
        now,
        s["app.timezone"],
        s["app.day_start_hour"],
      ),
    })
    .where(
      and(
        eq(sessions.profileId, profileId),
        eq(sessions.status, "in_progress"),
        ne(sessions.kind, "placement"),
        lt(sessions.startedAt, cutoff),
      ),
    )
    .returning({ id: sessions.id });
  return closed.length;
}

/**
 * 목록 칸 후보가 되는 수업 행(순수 — 회화 plan 정한 것 2): 회화는 새 꼴 카드(C189) 수업만이다. 옛 꼴 카드(개발 DB 의 앞 개정 — 1단계 회화)는
 * 둘째 프리뷰의 talk-1 둘째 판까지 열지 않는다(위험 14). 다른 영역은 그대로.
 */
export function listableLessonsOf<R extends Pick<LessonRow, "content">>(
  area: Area,
  rows: readonly R[],
): R[] {
  if (area !== "talk") return [...rows];
  return rows.filter(
    (row) =>
      talkCardKindOf((row.content as { card?: unknown } | null)?.card) ===
      "new",
  );
}

/** 칸(종류 · 번호)마다 프로필 묶음 변형, 그 칸에 없으면 가장 낮은 변형(정할 것 ㅂ). */
function pickVariant(
  rows: readonly LessonRow[],
  bundle: number,
): LessonCellView[] {
  const byCell = new Map<string, LessonRow[]>();
  for (const row of rows) {
    if (!LESSON_LIST_KINDS.includes(row.kind as LessonKindRef)) continue;
    const key = `${row.kind}:${row.lessonNo}`;
    byCell.set(key, [...(byCell.get(key) ?? []), row]);
  }
  const out: LessonCellView[] = [];
  for (const group of byCell.values()) {
    const sorted = [...group].sort(
      (a, b) => (a.topicVariant ?? 0) - (b.topicVariant ?? 0),
    );
    const row = sorted.find((r) => r.topicVariant === bundle) ?? sorted[0];
    if (!row || row.unit === null) continue;
    out.push({
      unit: row.unit,
      kind: row.kind as LessonKindRef,
      lessonNo: row.lessonNo,
      lessonId: row.id,
      variant: row.topicVariant ?? 0,
      title: row.listTitle,
      newWords: row.newWords,
      unitWords: row.unitWords,
      revision: row.revision,
      correction: row.correction,
    });
  }
  return out;
}

const snapshotNumber = (snapshot: unknown, key: string): number => {
  const value = (snapshot as Record<string, unknown> | null)?.[key];
  if (typeof value !== "number")
    throw new Error(`단원 복사본에 ${key} 가 없다`);
  return value;
};

/**
 * 쓰기 6~12 칸마다 가장 늦게 끝낸 첫 세션과 그 초고의 첨삭 상태(plan-p11b 값 11). 그 뒤에 끝낸 둘째 세션이 있는 칸은 넣지 않는다.
 * 첨삭 상태 글이 꼴이 아니면 대기로 본다(밀린 첨삭이 다시 부름).
 */
async function writingDraftsOf(
  db: DbOrTx,
  list: readonly SessionLite[],
): Promise<WritingDraft[]> {
  const latest = new Map<string, SessionLite>();
  const key = (s: SessionLite) =>
    s.ref ? `${s.ref.unit}:${s.ref.kind}:${s.ref.lessonNo}` : "";
  const endOf = (s: SessionLite) => (s.completedAt ?? s.startedAt).getTime();
  for (const s of list) {
    if (s.status !== "completed" || s.writingPart !== "draft" || !s.ref)
      continue;
    const before = latest.get(key(s));
    if (!before || endOf(s) > endOf(before)) latest.set(key(s), s);
  }
  const open = [...latest.values()].filter(
    (d) =>
      !list.some(
        (s) =>
          s.status === "completed" &&
          s.writingPart === "rewrite" &&
          key(s) === key(d) &&
          endOf(s) >= endOf(d),
      ),
  );
  if (open.length === 0) return [];
  const rows = await db
    .select({
      sessionId: attempts.sessionId,
      input: attempts.input,
      aiFeedback: attempts.aiFeedback,
    })
    .from(attempts)
    .where(
      inArray(
        attempts.sessionId,
        open.map((d) => d.id),
      ),
    );
  const lessonOf = await db
    .select({ id: sessions.id, lessonId: sessions.lessonId })
    .from(sessions)
    .where(
      inArray(
        sessions.id,
        open.map((d) => d.id),
      ),
    );
  return open.flatMap((d): WritingDraft[] => {
    const draft = rows.find((r) => {
      if (r.sessionId !== d.id) return false;
      const input = parseAttemptInput(r.input);
      return input?.kind === "draft" && input.step === "final";
    });
    const lessonRowId = lessonOf.find((l) => l.id === d.id)?.lessonId;
    if (!draft || !d.ref || !lessonRowId) return [];
    const state = feedbackStateOf(draft.aiFeedback)?.state ?? "pending";
    return [
      {
        ref: d.ref,
        variant: d.variant ?? 0,
        draftSessionId: d.id,
        lessonRowId,
        kind: d.kind,
        state: state === "pending" ? "awaiting" : state,
      },
    ];
  });
}

/**
 * 수업 목록 자료. 프로필이 없으면 no_profile, 배치 전 영역이면 placement. 먼저 오래 멈춘 세션을 닫는다. band 면 위 띠 막대 재료까지 읽는다
 * (목록 화면만 — 세션 시작 재판정 · 결과 '다음 수업' · 회화는 '여기부터 해요'만 쓰므로 읽지 않는다).
 */
export async function readLessonList({
  db = getDb(),
  area,
  now,
  band = false,
}: {
  db?: DbOrTx;
  /** 회화도 같은 목록이다(끝낸 수업 = 완료 세션 = 목표 턴에 닿은 회화, plan-p13b 값 6). */
  area: Area;
  now: Date;
  band?: boolean;
}): Promise<LessonListResult> {
  const profile = await readHouseholdProfile({ db });
  if (!profile) return { kind: "no_profile" };
  await closeStaleSessions({ db, profileId: profile.id, now });
  const built = await listInputOf({ db, profile, area, band });
  if (built.kind === "placement") return built;
  return {
    kind: "list",
    view: lessonListState(built.input),
    input: built.input,
  };
}

/**
 * 홈 회화 카드의 오늘 이야기 제목(4절 회화 카드 행): 수업 목록에서 '여기부터 해요'인 회화 수업의 제목. 배치 전이거나 '여기부터 해요'가
 * 수업이 아니면 null. 홈은 세션을 닫지 않으므로 목록이 열릴 때 닫힐 진행 세션(오래 멈춤)은 빼고 본다(같은 판정).
 */
export async function readTodayStoryTitle({
  db = getDb(),
  profile,
  now,
}: {
  db?: DbOrTx;
  profile: Pick<HouseholdProfile, "id" | "topicBundle">;
  now: Date;
}): Promise<string | null> {
  const built = await listInputOf({
    db,
    profile,
    area: "talk",
    band: false,
    staleBefore: await staleCutoffOf(db, profile.id, now),
  });
  if (built.kind === "placement") return null;
  return hereStartTitleOf(built.input, lessonListState(built.input));
}

/** 목록 입력(ListInput)을 모은다. band 면 위 띠 막대 재료까지, staleBefore 면 그보다 일찍 시작한 진행 세션(배치 평가 아님)을 뺀다. */
async function listInputOf({
  db,
  profile,
  area,
  band,
  staleBefore,
}: {
  db: DbOrTx;
  profile: Pick<HouseholdProfile, "id" | "topicBundle">;
  area: Area;
  band: boolean;
  staleBefore?: Date;
}): Promise<{ kind: "placement" } | { kind: "list"; input: ListInput }> {
  const [track] = await db
    .select()
    .from(profileTracks)
    .where(
      and(
        eq(profileTracks.profileId, profile.id),
        eq(profileTracks.area, area),
      ),
    );
  if (!track || track.level === null || track.unit === null)
    return { kind: "placement" };
  const level = track.level;
  const unit = track.unit;

  const rounds = await db
    .select()
    .from(unitProgress)
    .where(
      and(
        eq(unitProgress.profileId, profile.id),
        eq(unitProgress.area, area),
        eq(unitProgress.level, level),
      ),
    );
  const current = rounds
    .filter((r) => r.unit === unit)
    .sort((a, b) => b.round - a.round)[0];
  if (!current)
    throw new Error(`지금 단원 회차가 없다: ${area} ${level} ${unit}`);
  const unitsPassed = [
    ...new Set(
      rounds
        .filter((r) => r.passedAt !== null && r.unit < unit)
        .map((r) => r.unit),
    ),
  ].sort((a, b) => a - b);

  // 수업 칸: 지금 단원과 통과한 단원(그 회차의 시작 개정으로 고른 판)
  const bundle = Number(profile.topicBundle);
  const lessonsByUnit: Record<number, LessonCellView[]> = {};
  for (const u of [...unitsPassed, unit]) {
    const round =
      u === unit
        ? current
        : rounds
            .filter((r) => r.unit === u)
            .sort((a, b) => b.round - a.round)[0];
    const startRevision = round?.startRevision ?? current.startRevision;
    lessonsByUnit[u] = pickVariant(
      listableLessonsOf(
        area,
        await readLessonsOfUnit(
          { area, level, unit: u, startRevision },
          { db },
        ),
      ),
      bundle,
    );
  }

  // 이 단계 세션(수업 칸이 있는 것은 칸을 잇는다)
  const rows = await db
    .select({ session: sessions, lesson: lessons })
    .from(sessions)
    .leftJoin(lessons, eq(sessions.lessonId, lessons.id))
    .where(
      and(
        eq(sessions.profileId, profile.id),
        eq(sessions.area, area),
        eq(sessions.level, level),
        inArray(sessions.status, ["in_progress", "completed"]),
      ),
    );
  const live = staleBefore
    ? rows.filter(
        ({ session }) =>
          !(
            session.status === "in_progress" &&
            session.kind !== "placement" &&
            session.startedAt < staleBefore
          ),
      )
    : rows;
  const sessionsLite: SessionLite[] = live.map(({ session, lesson }) => ({
    id: session.id,
    status: session.status,
    kind: session.kind,
    ...(lesson &&
    lesson.unit !== null &&
    LESSON_LIST_KINDS.includes(lesson.kind as LessonKindRef)
      ? {
          ref: {
            unit: lesson.unit,
            kind: lesson.kind as LessonKindRef,
            lessonNo: lesson.lessonNo,
          },
          variant: lesson.topicVariant ?? 0,
        }
      : {}),
    ...(session.seedRevision !== null
      ? { seedRevision: session.seedRevision }
      : {}),
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    unit: session.unit,
    learningDay: session.learningDay,
    ...(session.writingPart ? { writingPart: session.writingPart } : {}),
  }));
  const writingDrafts =
    area === "writing" ? await writingDraftsOf(db, sessionsLite) : [];

  // 잠긴 다음 단원 수(plan 값 1 끝 문단, 정할 것 ㅇ — 단어 · 성적 조건은 P12). 규칙은 순수 함수 minLessonsOf · unitGateOf
  const cells = lessonsByUnit[unit] ?? [];
  let frameMinLessons: number | undefined;
  if (area === "writing" && level >= WRITING_FRAME_FROM) {
    const spec = await readLevelSpec(
      { area, level, startRevision: current.startRevision },
      { db },
    );
    const frameMin = (
      spec?.spec as { frame?: { minLessons?: unknown } } | undefined
    )?.frame?.minLessons;
    if (typeof frameMin === "number") frameMinLessons = frameMin;
  }
  const minLessons = minLessonsOf({
    area,
    level,
    assignedCount: cells.filter(
      (c) => c.kind === "assigned" || c.kind === "alphabet",
    ).length,
    snapshotMinLessons: snapshotNumber(
      current.settingsSnapshot,
      MIN_LESSONS_KEY,
    ),
    ...(frameMinLessons !== undefined ? { frameMinLessons } : {}),
  });
  const gate = unitGateOf({
    unit,
    roundStartedAt: current.startedAt,
    minLessons,
    minDays: snapshotNumber(current.settingsSnapshot, MIN_DAYS_KEY),
    sessions: sessionsLite,
  });

  const state: ListState =
    current.parentCheck === PARENT_CHECK_PENDING
      ? "parent_check"
      : track.nextLevelPending
        ? "next_level_pending"
        : track.graduated
          ? "graduated"
          : "normal";

  const input: ListInput = {
    area,
    level,
    unit,
    roundStartedAt: current.startedAt,
    currentPassed: current.passedAt !== null,
    unitsPassed,
    lessonsByUnit,
    sessions: sessionsLite,
    gate,
    state,
    feedbackReady: writingDrafts
      .filter((d) => d.state === "ready")
      .map((d) => d.ref),
    writingDrafts,
    remedialIssued: [],
    practice: [],
    reviewDue: false,
    unitsPerLevel: UNITS_PER_LEVEL,
    ...(band
      ? {
          bandFacts: await readBandFacts({
            db,
            profileId: profile.id,
            area,
            level,
            unit,
            rounds,
            current,
            minLessons,
          }),
        }
      : {}),
  };
  return { kind: "list", input };
}

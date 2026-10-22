import "server-only";
// 홈 자료(4절 홈 표 · AC-2a, plan-p10b 파일별 값 4). 영역 카드 넷의 단계 · 단원 5칸 · 막대 둘 · 이번 주 n일 · 오늘 완료,
// 별 합 · 부모 점 · 이름. 판정 기준(unit.recent_window · unit.recent_score · unit.min_lessons)은 그 단원 회차의 복사본에서,
// 학습일은 app.timezone · app.day_start_hour 로 센다. 시각은 인자로 받고 질의 SQL 안에 now() 를 쓰지 않는다.
// 아는 단어 · 복습 · 연속 일수는 P12, 최근 성적 · 끝낸 대화는 세션 완료(P11 · 1-나)가 생기면 채워진다(그 전에는 0 · 빈 칸).
// 쓰기 6~12(plan-p11b 값 12): '첨삭이 왔어요'(지금 단계에서 첨삭이 온 가장 오래된 첫 세션의 수업 행), 최근 성적은 점수 없는 세션과
// 둘째 세션(고쳐 쓰기)을 빼고 센다(수업 하나 = 첫 세션 점수).
import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  sql,
} from "drizzle-orm";
import { learningDayOf } from "@/core/learning-day";
import { AREAS, type Area, UNITS_PER_LEVEL } from "@/core/seed/structure";
import { parseAttemptInput } from "@/core/session/attempt";
import {
  type DoneSession,
  thisWeekDays,
  todayDone,
  weekStartOf,
} from "@/core/today/done";
import { feedbackStateOf } from "@/core/writing/feedback";
import { vocab } from "@/db/schema/content";
import {
  attempts,
  profileTracks,
  sessions,
  starLedger,
  unitProgress,
  vocabProgress,
} from "@/db/schema/learning";
import { parentAlerts } from "@/db/schema/operations";
import { type Db, getDb } from "@/server/db";
import { readHouseholdProfile } from "@/server/profile";
import { readUnitSpec } from "@/server/seed/read";
import {
  appDayStartHourSchema,
  appTimezoneSchema,
  getSettings,
} from "@/server/settings";

export type UnitCell = "passed" | "current" | "upcoming";
export type RecentCell = "pass" | "miss" | "empty";

export type HomeCard = {
  area: Area;
  /** 배치 전(placement) · 말하기 시작 단계 전 회화(needs_speaking) · 없음. */
  gate: "placement" | "needs_speaking" | null;
  level?: number;
  unit?: number;
  unitTopic?: string;
  unitCells: UnitCell[];
  knownWords: number;
  unitWords: number;
  /** 최근 정규 수업 칸(unit.recent_window 개, 오래된 것부터). 회화는 빈 배열. */
  recent: RecentCell[];
  /** 회화: 끝낸 대화 n / 최소 수업 수. */
  talks?: { done: number; min: number };
  thisWeek: number;
  today: { done: boolean; newLessonDone: boolean };
};

export type HomeView = {
  displayName: string;
  starTotal: number;
  parentDot: boolean;
  cards: HomeCard[];
  /** 쓰기 첨삭이 온 수업(누르면 그 수업 startLesson → 둘째 세션, AC-2a). 없으면 null. */
  feedbackReady: { lessonId: string } | null;
};

/** 아는 단어로 세는 단어장 상태(3.2 — 읽기 · 말하기 '알아봄', 쓰기 '씀', 회화 '말함'). */
const KNOWN_STATE = {
  reading: "recognize",
  writing: "write",
  speaking: "recognize",
  talk: "say",
} as const satisfies Record<Area, "recognize" | "write" | "say">;
const RECENT_WINDOW_KEY = "unit.recent_window";
const RECENT_SCORE_KEY = "unit.recent_score";
const MIN_LESSONS_KEY = "unit.min_lessons";
/** 부모 확인 대기 값(plan-p10b 정할 것 ㅅ — P12 가 같은 값을 쓴다). */
const PARENT_CHECK_PENDING = "pending";

const snapshotNumber = (snapshot: unknown, key: string): number => {
  const value = (snapshot as Record<string, unknown> | null)?.[key];
  if (typeof value !== "number") {
    throw new Error(`단원 복사본에 ${key} 가 없다`);
  }
  return value;
};

/** 홈 자료. 프로필이 없으면 undefined(화면은 첫 실행으로). */
export async function readHome({
  db = getDb(),
  now,
}: {
  db?: Db;
  now: Date;
}): Promise<HomeView | undefined> {
  const profile = await readHouseholdProfile({ db });
  if (!profile) return undefined;
  const settings = await getSettings(
    {
      "app.timezone": appTimezoneSchema,
      "app.day_start_hour": appDayStartHourSchema,
    },
    { db, profileId: profile.id },
  );
  const today = learningDayOf(
    now,
    settings["app.timezone"],
    settings["app.day_start_hour"],
  );
  const weekStart = weekStartOf(today);

  const tracks = await db
    .select()
    .from(profileTracks)
    .where(eq(profileTracks.profileId, profile.id));
  const progressRows = await db
    .select()
    .from(unitProgress)
    .where(eq(unitProgress.profileId, profile.id));
  const doneRows = await db
    .select({
      area: sessions.area,
      kind: sessions.kind,
      status: sessions.status,
      learningDay: sessions.learningDay,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.profileId, profile.id),
        eq(sessions.status, "completed"),
        gte(sessions.learningDay, weekStart),
      ),
    );

  const cards: HomeCard[] = [];
  for (const area of AREAS) {
    const track = tracks.find((t) => t.area === area);
    const allAreaSessions: DoneSession[] = doneRows
      .filter((s) => s.area === area)
      .map((s) => ({
        kind: s.kind,
        status: s.status,
        learningDay: s.learningDay,
      }));
    // '이번 주 n일'은 배치 평가를 끝낸 날도 센다(plan 정할 것 ㄴ 글자대로 · 3.5 연속 학습 일수와 같은 결, 검토 M-2 결정 (가)).
    // 오늘 완료는 배치 평가로 켜지지 않는다(4절) — 그쪽에만 뺀다
    const thisWeek = thisWeekDays({
      today,
      learningDays: allAreaSessions.flatMap((s) =>
        s.learningDay ? [s.learningDay] : [],
      ),
    });
    const areaSessions = allAreaSessions.filter((s) => s.kind !== "placement");
    const level = track?.level ?? undefined;
    const unit = track?.unit ?? undefined;
    if (level === undefined || unit === undefined) {
      cards.push({
        area,
        gate: area === "talk" ? "needs_speaking" : "placement",
        unitCells: Array.from({ length: UNITS_PER_LEVEL }, () => "upcoming"),
        knownWords: 0,
        unitWords: 0,
        recent: [],
        thisWeek,
        today: { done: false, newLessonDone: false },
      });
      continue;
    }
    const rounds = progressRows.filter(
      (p) => p.area === area && p.level === level,
    );
    // 지금 단원의 가장 늦은 회차
    const current = rounds
      .filter((p) => p.unit === unit)
      .sort((a, b) => b.round - a.round)[0];
    const unitCells: UnitCell[] = Array.from(
      { length: UNITS_PER_LEVEL },
      (_, i) => {
        const u = i + 1;
        if (u === unit) return "current";
        return rounds.some((p) => p.unit === u && p.passedAt !== null)
          ? "passed"
          : "upcoming";
      },
    );
    const spec = current
      ? await readUnitSpec(
          { area, level, unit, startRevision: current.startRevision },
          { db },
        )
      : undefined;
    const targetVocab = spec?.targetVocab ?? [];
    const knownWords =
      targetVocab.length === 0
        ? 0
        : await db
            .select({ n: sql<number>`count(*)::int` })
            .from(vocabProgress)
            .innerJoin(vocab, eq(vocabProgress.vocabId, vocab.id))
            .where(
              and(
                eq(vocabProgress.profileId, profile.id),
                eq(vocabProgress.state, KNOWN_STATE[area]),
                eq(vocabProgress.known, true),
                inArray(vocab.word, targetVocab),
              ),
            )
            .then(([row]) => row?.n ?? 0);

    // 이 단원 회차에서 끝낸 정규 수업(최근 성적 · 끝낸 대화)
    const regular = current
      ? await db
          .select({ score: sessions.score, writingPart: sessions.writingPart })
          .from(sessions)
          .where(
            and(
              eq(sessions.profileId, profile.id),
              eq(sessions.area, area),
              eq(sessions.level, level),
              eq(sessions.unit, unit),
              eq(sessions.kind, "regular"),
              eq(sessions.status, "completed"),
              gte(sessions.completedAt, current.startedAt),
            ),
          )
          .orderBy(desc(sessions.completedAt))
      : [];
    let recent: RecentCell[] = [];
    let talks: HomeCard["talks"];
    if (area === "talk") {
      talks = {
        done: regular.length,
        min: current
          ? snapshotNumber(current.settingsSnapshot, MIN_LESSONS_KEY)
          : 0,
      };
    } else if (current) {
      const windowSize = snapshotNumber(
        current.settingsSnapshot,
        RECENT_WINDOW_KEY,
      );
      const pass = snapshotNumber(current.settingsSnapshot, RECENT_SCORE_KEY);
      // 점수 없는 세션(쓰기 확인 실패 · 첨삭 전 …)과 쓰기 둘째 세션은 빼고 센다(3.7 · 값 12)
      const last = regular
        .filter((s) => s.score !== null && s.writingPart !== "rewrite")
        .slice(0, windowSize)
        .reverse();
      recent = Array.from({ length: windowSize }, (_, i) => {
        const s = last[i];
        if (!s) return "empty";
        return s.score !== null && s.score >= pass ? "pass" : "miss";
      });
    }
    const noNewLessonPossible =
      current?.parentCheck === PARENT_CHECK_PENDING ||
      track?.nextLevelPending === true ||
      track?.graduated === true;
    cards.push({
      area,
      gate: null,
      level,
      unit,
      ...(spec ? { unitTopic: spec.topic } : {}),
      unitCells,
      knownWords,
      unitWords: targetVocab.length,
      recent,
      ...(talks ? { talks } : {}),
      thisWeek,
      today: todayDone({
        today,
        sessions: areaSessions,
        // 복습은 P12 — 그 전에는 복습할 카드가 없다
        reviewDue: false,
        reviewDoneToday: false,
        noNewLessonPossible,
      }),
    });
  }

  const [stars] = await db
    .select({ n: sql<number>`coalesce(sum(${starLedger.count}), 0)::int` })
    .from(starLedger)
    .where(eq(starLedger.profileId, profile.id));
  const [alert] = await db
    .select({ id: parentAlerts.id })
    .from(parentAlerts)
    .where(isNull(parentAlerts.acknowledgedAt))
    .limit(1);

  const writingLevel = tracks.find((t) => t.area === "writing")?.level;
  return {
    displayName: profile.displayName,
    starTotal: stars?.n ?? 0,
    parentDot: alert !== undefined,
    cards,
    feedbackReady:
      writingLevel === null || writingLevel === undefined
        ? null
        : await feedbackReadyOf(db, profile.id, writingLevel),
  };
}

/** 지금 쓰기 단계에서 첨삭이 온(둘째 세션을 아직 끝내지 않은) 가장 오래된 첫 세션의 수업 행(값 12). */
async function feedbackReadyOf(
  db: Db,
  profileId: string,
  level: number,
): Promise<{ lessonId: string } | null> {
  const parts = await db
    .select({
      id: sessions.id,
      lessonId: sessions.lessonId,
      writingPart: sessions.writingPart,
      completedAt: sessions.completedAt,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.profileId, profileId),
        eq(sessions.area, "writing"),
        eq(sessions.level, level),
        eq(sessions.status, "completed"),
        isNotNull(sessions.writingPart),
      ),
    );
  const firsts = parts
    .filter((p) => p.writingPart === "draft" && p.lessonId && p.completedAt)
    .sort(
      (a, b) =>
        (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0),
    );
  for (const first of firsts) {
    const rewritten = parts.some(
      (p) =>
        p.writingPart === "rewrite" &&
        p.lessonId === first.lessonId &&
        (p.completedAt?.getTime() ?? 0) >= (first.completedAt?.getTime() ?? 0),
    );
    if (rewritten || !first.lessonId) continue;
    const rows = await db
      .select({ input: attempts.input, aiFeedback: attempts.aiFeedback })
      .from(attempts)
      .where(eq(attempts.sessionId, first.id));
    const ready = rows.some((r) => {
      const input = parseAttemptInput(r.input);
      return (
        input?.kind === "draft" &&
        input.step === "final" &&
        feedbackStateOf(r.aiFeedback)?.state === "ready"
      );
    });
    if (ready) return { lessonId: first.lessonId };
  }
  return null;
}

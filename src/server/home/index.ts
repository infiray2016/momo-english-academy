import "server-only";
// 홈 자료(4절 홈 표 · AC-2a, plan-p10b 파일별 값 4). 영역 카드 넷의 단계 · 이번 주 n일 · 오늘 완료 · 첫 사용 꼴, 회화 카드의 오늘 이야기
// 제목, 별 합 · 부모 점 · 이름. 학습일은 app.timezone · app.day_start_hour 로 센다. 시각은 인자로 받고 질의 SQL 안에 now() 를 쓰지 않는다.
// 단원 5칸 · 막대 둘(아는 단어 · 최근 성적 · 끝낸 대화)은 수업 목록 위 띠로 옮겼다(UI · UX 묶음 3 · [승인 UX2] · R-4 · R-13 —
// server/lesson-list/band.ts). 연속 일수 · 복습은 P12 몫이다.
// 쓰기 6~12(plan-p11b 값 12): '첨삭이 왔어요'(지금 단계에서 첨삭이 온 가장 오래된 첫 세션의 수업 행).
// 첫 사용 꼴(13절 C166 R7 · UX 검토 3판 U2-1): 그 영역에서 배치 평가 말고 끝낸 세션이 하나도 없으면 firstLesson(화면이 0 · '이번 주' ·
// '오늘 아직이에요'를 숨긴다).
// 회화 카드의 오늘 이야기 제목(4절 회화 카드 행 · R-8): 수업 목록에서 '여기부터 해요'인 회화 수업의 제목(readTodayStoryTitle — 같은 입력 ·
// 같은 함수). 첫 사용 꼴 · 배치 전에는 읽지 않는다.
// 별 합(3.5 R12 · C166 R3 · C167 (5) — P12 전 잠정 셈): 별 장부가 아직 비어 있어, 끝낸 세션을 결과 · 마무리와 같은 셈(core/reward/star
// earnsStar)으로 세어 reward.star_complete 를 곱한다(설정값을 바꾸면 지난 별도 다시 셈). P12 가 장부를 쓰면 장부 합으로 돌아간다.
import { and, eq, gte, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import { learningDayOf } from "@/core/learning-day";
import { starTotalOf } from "@/core/reward/star";
import { AREAS, type Area } from "@/core/seed/structure";
import { parseAttemptInput } from "@/core/session/attempt";
import {
  type DoneSession,
  thisWeekDays,
  todayDone,
  weekStartOf,
} from "@/core/today/done";
import { feedbackStateOf } from "@/core/writing/feedback";
import {
  attempts,
  profileTracks,
  sessions,
  unitProgress,
} from "@/db/schema/learning";
import { parentAlerts } from "@/db/schema/operations";
import { type Db, getDb } from "@/server/db";
import { readTodayStoryTitle } from "@/server/lesson-list";
import { readHouseholdProfile } from "@/server/profile";
import {
  appDayStartHourSchema,
  appTimezoneSchema,
  getSettings,
} from "@/server/settings";

export type HomeCard = {
  area: Area;
  /** 배치 전(placement) · 말하기 시작 단계 전 회화(needs_speaking) · 없음. */
  gate: "placement" | "needs_speaking" | null;
  level?: number;
  unit?: number;
  thisWeek: number;
  today: { done: boolean; newLessonDone: boolean };
  /** 그 영역에서 배치 평가 말고 끝낸 세션이 하나도 없다(첫 사용 꼴 — C166 R7). */
  firstLesson: boolean;
  /** 회화: 오늘 이야기 제목(수업 목록 '여기부터 해요' 회화 수업, 없으면 비움). */
  storyTitle?: string;
};

export type HomeView = {
  displayName: string;
  starTotal: number;
  parentDot: boolean;
  cards: HomeCard[];
  /** 쓰기 첨삭이 온 수업(누르면 그 수업 startLesson → 둘째 세션, AC-2a). 없으면 null. */
  feedbackReady: { lessonId: string } | null;
};

/** 부모 확인 대기 값(plan-p10b 정할 것 ㅅ — P12 가 같은 값을 쓴다). */
const PARENT_CHECK_PENDING = "pending";

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
      "reward.star_complete": z.number().int().nonnegative(),
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

  // 그 프로필의 끝낸 세션(언제든) 한 번 읽기 — 첫 사용 꼴(배치 평가 말고 끝낸 세션이 있는 영역, C166 R7)과 별 합(결과 · 마무리와 같은 셈
  // earnsStar × reward.star_complete, C167 (5))을 함께 낸다(검토 B M-1)
  const finished = await db
    .select({
      area: sessions.area,
      kind: sessions.kind,
      status: sessions.status,
      writingPart: sessions.writingPart,
    })
    .from(sessions)
    .where(
      and(eq(sessions.profileId, profile.id), eq(sessions.status, "completed")),
    );
  const triedAreas = new Set(
    finished.filter((s) => s.kind !== "placement").map((s) => s.area),
  );
  const starTotal = starTotalOf(finished, settings["reward.star_complete"]);

  const cards: HomeCard[] = [];
  for (const area of AREAS) {
    const firstLesson = !triedAreas.has(area);
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
        thisWeek,
        today: { done: false, newLessonDone: false },
        firstLesson,
      });
      continue;
    }
    // 지금 단원의 가장 늦은 회차(부모 확인 대기)
    const current = progressRows
      .filter((p) => p.area === area && p.level === level && p.unit === unit)
      .sort((a, b) => b.round - a.round)[0];
    const noNewLessonPossible =
      current?.parentCheck === PARENT_CHECK_PENDING ||
      track?.nextLevelPending === true ||
      track?.graduated === true;
    const storyTitle =
      area === "talk" && !firstLesson
        ? await storyTitleOf(db, profile, now)
        : null;
    cards.push({
      area,
      gate: null,
      level,
      unit,
      thisWeek,
      today: todayDone({
        today,
        sessions: areaSessions,
        // 복습은 P12 — 그 전에는 복습할 카드가 없다
        reviewDue: false,
        reviewDoneToday: false,
        noNewLessonPossible,
      }),
      firstLesson,
      ...(storyTitle ? { storyTitle } : {}),
    });
  }

  const [alert] = await db
    .select({ id: parentAlerts.id })
    .from(parentAlerts)
    .where(isNull(parentAlerts.acknowledgedAt))
    .limit(1);

  const writingLevel = tracks.find((t) => t.area === "writing")?.level;
  return {
    displayName: profile.displayName,
    starTotal,
    parentDot: alert !== undefined,
    cards,
    feedbackReady:
      writingLevel === null || writingLevel === undefined
        ? null
        : await feedbackReadyOf(db, profile.id, writingLevel),
  };
}

/** 오늘 이야기 제목. 읽지 못하면(목록 자료 오류) 제목 없이 카드를 그리고 오류 이름만 남긴다 — 홈을 막지 않는다. */
async function storyTitleOf(
  db: Db,
  profile: { id: string; topicBundle: string },
  now: Date,
): Promise<string | null> {
  try {
    return await readTodayStoryTitle({ db, profile, now });
  } catch (error) {
    console.error(
      `오늘 이야기 제목 읽기 실패(${error instanceof Error ? error.name : "unknown"})`,
    );
    return null;
  }
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

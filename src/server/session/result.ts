import "server-only";
// 결과 화면 자료(4절 세션 결과 행 · plan-p11a 값 8 · 정할 것 바). 그 프로필의 끝난 수업 세션만 낸다.
// '다음 수업'은 수업 목록의 '여기부터 해요'와 같은 수업(P10 readLessonList → lessonListState 의 hereStart)이다.
// 하던 수업 · 수업 · 연습이면 그 수업을, 그 밖(단계 평가 · 복습 — P12 · 첨삭 보기 — b)이나 없으면 '수업 목록'이다.
// 별 · 오늘 얻은 단어 · 단원 막대 · '단원 n을 통과했어요!' · '다시 했어요'는 P12 가 더한다. 숫자 · 퍼센트를 내지 않는다.
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { LessonItem, LessonRef } from "@/core/lesson-list/state";
import type { Area } from "@/core/seed/structure";
import { lessons } from "@/db/schema/content";
import { sessions } from "@/db/schema/learning";
import { type Db, getDb } from "@/server/db";
import { readLessonList } from "@/server/lesson-list";
import { readHouseholdProfile } from "@/server/profile";

type LessonArea = Exclude<Area, "talk">;

/** 결과 화면 큰 단추가 열 곳. */
export type ResultNext =
  | { kind: "lesson"; lessonId: string }
  | { kind: "resume"; sessionId: string }
  | { kind: "list" };

export type ResultView = {
  sessionId: string;
  area: LessonArea;
  level: number;
  unit: number;
  /** 세션 종류(5절 sessions.kind — P12 가 다시 하기 · 보강 결과를 가른다). */
  kind: (typeof sessions.$inferSelect)["kind"];
  title: string;
  next: ResultNext;
};

const sameRef = (a: LessonRef, b: LessonRef) =>
  a.unit === b.unit && a.kind === b.kind && a.lessonNo === b.lessonNo;

/** 결과 화면 자료. 그 프로필의 끝난 수업 세션이 아니면 undefined(쪽이 홈으로). */
export async function loadResultView(
  { sessionId }: { sessionId: string },
  { db = getDb(), now }: { db?: Db; now: () => Date },
): Promise<ResultView | undefined> {
  if (!z.uuid().safeParse(sessionId).success) return undefined;
  const profile = await readHouseholdProfile({ db });
  if (!profile) return undefined;
  const [row] = await db
    .select({ session: sessions, title: lessons.listTitle })
    .from(sessions)
    .innerJoin(lessons, eq(lessons.id, sessions.lessonId))
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.profileId, profile.id),
        eq(sessions.status, "completed"),
      ),
    );
  if (
    !row ||
    row.session.area === "talk" ||
    row.session.level === null ||
    row.session.unit === null
  )
    return undefined;
  const area = row.session.area;
  const list = await readLessonList({ db, area, now: now() });
  let next: ResultNext = { kind: "list" };
  if (list.kind === "list") {
    const here = list.view.hereStart;
    const items: LessonItem[] = [
      ...(list.view.current?.front ?? []),
      ...(list.view.current?.back ?? []),
      ...list.view.practice,
    ];
    if (here?.kind === "resume")
      next = { kind: "resume", sessionId: here.sessionId };
    else if (here?.kind === "lesson" || here?.kind === "practice") {
      const item = items.find((i) => sameRef(i.ref, here.ref));
      if (item) next = { kind: "lesson", lessonId: item.lessonId };
    }
  }
  return {
    sessionId,
    area,
    level: row.session.level,
    unit: row.session.unit,
    kind: row.session.kind,
    title: row.title,
    next,
  };
}

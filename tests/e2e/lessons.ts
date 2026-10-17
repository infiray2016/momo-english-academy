// e2e 전용 단계 견본 수업(plan-p11a 값 10). 시험용 시드는 1단계뿐이라 4 · 6 · 10단계 화면은 견본 빌더(readingLesson 4 ·
// writingLesson 3 · 4 · 6 · speakingLesson 6 · 10)의 수업을 lessons 행으로 넣어 본다(판은 DB 최신 개정 · 정정 0, 검증 밖 —
// P10 cloneLessons 와 같은 결). 견본 규격은 기본 틀(referenceSet(defaultSettings())) — 작은 틀 규격으로는 읽기 견본이 만들어지지
// 않는다(plan 의 추측과 다름, 차례 2 보고). 지어낸 낱말이라 DB vocab 에 없을 수 있고 그림은 뜻 글로 보인다.
import { and, eq, max } from "drizzle-orm";
import type { Area } from "../../src/core/seed/structure";
import { LEVEL_MAX } from "../../src/core/seed/structure";
import { lessons, levelSpecs } from "../../src/db/schema/content";
import { SEED_REVISION_TABLES } from "../../src/db/schema/seed-revision";
import type { LessonSample } from "../fixtures/seed/builders";
import { e2eDb, withHouseholdSetting } from "./db";
import { insertHousehold } from "./household";

type LessonKind = "assigned" | "reinforce";
type LessonRow = typeof lessons.$inferSelect;

/** 시드 테이블 다섯의 가장 큰 개정(insertHousehold 가 단원 회차 시작 개정으로 쓰는 값과 같다). */
async function latestRevision(): Promise<number> {
  let latest = 0;
  for (const table of SEED_REVISION_TABLES) {
    const [row] = await e2eDb()
      .select({ r: max(table.revision) })
      .from(table);
    latest = Math.max(latest, Number(row?.r ?? 0));
  }
  return latest;
}

/** 견본 수업 하나를 lessons 행으로 넣는다(같은 칸 · 판이 있으면 그 행). 넣은 행을 돌려준다. */
export async function insertSampleLesson<A extends Exclude<Area, "talk">>({
  sample,
  kind = "assigned",
  lessonNo = 1,
  variant = 1,
}: {
  sample: LessonSample<A>;
  kind?: LessonKind;
  lessonNo?: number;
  variant?: number;
}): Promise<LessonRow> {
  const db = e2eDb();
  const revision = await latestRevision();
  const lesson = {
    ...sample.lesson,
    kind,
    lessonNo,
    variant,
    revision,
    correction: 0,
  };
  const [inserted] = await db
    .insert(lessons)
    .values({
      area: sample.area,
      level: sample.level,
      unit: sample.unit,
      kind,
      lessonNo,
      topicVariant: variant,
      listTitle: sample.lesson.title,
      content: lesson,
      newWords: [...sample.lesson.newWords],
      unitWords: [...sample.lesson.unitWords],
      generation: sample.lesson.generation,
      revision,
      correction: 0,
    })
    .onConflictDoNothing()
    .returning();
  if (inserted) return inserted;
  const [existing] = await db
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.area, sample.area),
        eq(lessons.level, sample.level),
        eq(lessons.unit, sample.unit),
        eq(lessons.kind, kind),
        eq(lessons.lessonNo, lessonNo),
        eq(lessons.topicVariant, variant),
        eq(lessons.revision, revision),
        eq(lessons.correction, 0),
      ),
    );
  if (!existing) throw new Error("견본 수업을 넣지 못했다");
  return existing;
}

/**
 * 그 영역을 그 단계에서 시작한 집으로 fn 을 돌린다: 시드 범위 끝(seed.complete_through_level)을 그 동안만 마지막 단계로 두고
 * insertHousehold({ startLevels: { [area]: level } }) 뒤 fn(프로필 id).
 */
export async function atLevel<T>(
  { area, level }: { area: Exclude<Area, "talk">; level: number },
  fn: (profileId: string) => Promise<T>,
): Promise<T> {
  return withHouseholdSetting(
    "seed.complete_through_level",
    LEVEL_MAX,
    async () => {
      const { profileId } = await insertHousehold({
        startLevels: { [area]: level },
      });
      return fn(profileId);
    },
  );
}

/** 그 영역 · 단계의 단계 규격(DB level_specs 의 spec — 시험 숫자를 규격에서 읽는다). */
export async function levelSpecOf(
  area: Exclude<Area, "talk">,
  level: number,
): Promise<Record<string, unknown>> {
  const rows = await e2eDb()
    .select()
    .from(levelSpecs)
    .where(and(eq(levelSpecs.area, area), eq(levelSpecs.level, level)));
  const row = rows.sort(
    (a, b) => b.revision - a.revision || b.correction - a.correction,
  )[0];
  if (!row) throw new Error(`${area} ${level}단계 규격 없음`);
  return row.spec as Record<string, unknown>;
}

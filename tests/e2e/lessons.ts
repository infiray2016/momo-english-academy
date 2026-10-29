// e2e 전용 단계 견본 수업(plan-p11a 값 10). 시험용 시드는 1단계뿐이라 4 · 6 · 10단계 화면은 견본 빌더(readingLesson 4 ·
// writingLesson 3 · 4 · 6 · speakingLesson 6 · 10)의 수업을 lessons 행으로 넣어 본다(판은 DB 최신 개정 · 정정 0, 검증 밖 —
// P10 cloneLessons 와 같은 결). 견본 규격은 기본 틀(referenceSet(defaultSettings())) — 작은 틀 규격으로는 읽기 견본이 만들어지지
// 않는다(plan 의 추측과 다름, 차례 2 보고). 지어낸 낱말이라 DB vocab 에 없을 수 있고 그림은 뜻 글로 보인다.
import { randomUUID } from "node:crypto";
import { and, eq, max } from "drizzle-orm";
import type { Area } from "../../src/core/seed/structure";
import { LEVEL_MAX } from "../../src/core/seed/structure";
import { lessons, levelSpecs } from "../../src/db/schema/content";
import { attempts, sessions } from "../../src/db/schema/learning";
import { SEED_REVISION_TABLES } from "../../src/db/schema/seed-revision";
import {
  defaultSettings,
  type LessonSample,
  referenceSet,
  writingLesson,
} from "../fixtures/seed/builders";
import { e2eDb, insertSessions, withHouseholdSetting } from "./db";
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

/** 쓰기 5단계 견본의 과제 글 · 제목 · 힌트 · 채점표(그 단계 입력 꼴 — 자판, 장부 86행 (2) · 전체 디자인 리뷰 M-11 (2)). */
const GUIDED_5 = {
  title: "쓰기 5단계 첫 수업",
  task: "예시문을 보고 빈칸에 알맞은 낱말을 자판으로 써서 문장을 완성해요.",
  hints: ["Type the missing word."],
  rubric: ["빈칸에 알맞은 낱말을 바르게 썼다"],
} as const;

/**
 * 쓰기 4~5 견본(plan-p11b 브리프 — 견본 빌더 writingLesson(ref, 4)). 5단계는 같은 문장 틀을 5단계로 옮기고 과제 글 · 제목 · 힌트 · 채점표는
 * 5단계 입력 꼴(기기 자판)로 바꾼다 — 4단계 '단어 상자에서 골라'가 5단계 화면에 나오지 않게. 넣는 꼴은 그 단계 규격(amount.input)에서 온다.
 */
export function guidedSample(level: 4 | 5): LessonSample<"writing"> {
  const sample = writingLesson(referenceSet(defaultSettings()), 4);
  if (sample.lesson.content.shape !== "guided") throw new Error("견본 꼴");
  if (level === 4) return { ...sample, level };
  return {
    ...sample,
    level,
    lesson: {
      ...sample.lesson,
      title: GUIDED_5.title,
      content: {
        ...sample.lesson.content,
        task: GUIDED_5.task,
        hints: [...GUIDED_5.hints],
        rubric: [...GUIDED_5.rubric],
      },
    },
  };
}

/** 쓰기 6단계 견본(자유 작문 — 견본 빌더 writingLesson(ref, 6), 차례 6). */
export function compositionSample(): LessonSample<"writing"> {
  const sample = writingLesson(referenceSet(defaultSettings()), 6);
  if (sample.lesson.content.shape !== "composition") throw new Error("견본 꼴");
  return sample;
}

/** 그 수업의 진행 세션을 바로 넣는다(목록을 거치지 않음 — 정규 수업, 수업 행의 판). 세션 id 를 돌려준다. */
export async function openLessonSession(
  profileId: string,
  lesson: LessonRow,
  { writingPart }: { writingPart?: "draft" } = {},
): Promise<string> {
  const [sessionId] = await insertSessions([
    {
      profileId,
      area: lesson.area,
      level: lesson.level,
      unit: lesson.unit ?? 1,
      lessonId: lesson.id,
      kind: "regular",
      status: "in_progress",
      startedAt: new Date(),
      seedRevision: lesson.revision,
      seedCorrection: lesson.correction,
      ...(writingPart ? { writingPart } : {}),
    },
  ]);
  if (!sessionId) throw new Error("세션 없음");
  return sessionId;
}

/** 시험 첨삭 값(쓰기 6단계 — 교정 둘 · 모범 답안 · 채점표, 6.2 쓰기 첨삭 꼴). */
export const READY_FEEDBACK = {
  praise: "강아지와 노는 하루를 차례대로 잘 썼어요.",
  corrections: [
    {
      original: "I love it.",
      corrected: "I love my dog.",
      reason: "무엇을 좋아하는지 분명히 써요.",
    },
    {
      original: "We goes",
      corrected: "We go",
      reason: "We 뒤에는 go 를 써요.",
    },
  ],
  modelAnswer: "I have a small dog. We go to the park and play every day.",
  rubric: { task: 4, grammar: 3, vocabulary: 3 },
} as const;
export const READY_DRAFT = "I have a dog. We goes to the park. I love it.";

/**
 * 첨삭이 온(pending 이면 첨삭을 기다리는) 쓰기 6~12 첫 세션 하나를 바로 넣는다(초고 끝 시도 — 첨삭 옴 · 채점표 점수, 끝난 첫 세션). 둘째 세션 · 홈 '첨삭이 왔어요'
 * 시험의 바탕. 첫 세션 id 를 돌려준다.
 */
export async function insertReadyDraft(
  profileId: string,
  lesson: LessonRow,
  {
    pending = false,
    claimed = false,
  }: {
    pending?: boolean;
    /** 첨삭 대기를 다른 부름이 막 잡은 꼴(claimedAt 지금) — 서버가 첨삭을 더 부르지 못해 '아직 글을 살펴보고 있어요'가 된다. */
    claimed?: boolean;
  } = {},
): Promise<string> {
  const db = e2eDb();
  const at = new Date();
  const score =
    (READY_FEEDBACK.rubric.task +
      READY_FEEDBACK.rubric.grammar +
      READY_FEEDBACK.rubric.vocabulary) /
    3 /
    4;
  const [first] = await db
    .insert(sessions)
    .values({
      profileId,
      area: "writing",
      level: lesson.level,
      unit: lesson.unit ?? 1,
      lessonId: lesson.id,
      kind: "regular",
      status: "completed",
      startedAt: at,
      completedAt: at,
      learningDay: at.toISOString().slice(0, 10),
      seedRevision: lesson.revision,
      seedCorrection: lesson.correction,
      writingPart: "draft",
      // 첨삭 대기면 점수는 비어 있다(첨삭이 올 때 채움)
      ...(pending ? {} : { score }),
    })
    .returning({ id: sessions.id });
  if (!first) throw new Error("첫 세션을 넣지 못했다");
  await db.insert(attempts).values({
    sessionId: first.id,
    clientAttemptId: randomUUID(),
    activityNo: 4,
    input: { v: 1, kind: "draft", step: "final", text: READY_DRAFT },
    attemptedAt: at,
    ...(pending
      ? {
          // 첨삭 대기(응답 뒤 첨삭이 실패해 대기로 돌아온 때와 같은 꼴) — claimed 면 다른 부름이 잡고 있는 중
          aiFeedback: {
            state: "pending",
            failures: 1,
            refusals: 0,
            ...(claimed ? { claimedAt: at.toISOString() } : {}),
          },
          status: "awaiting_feedback" as const,
        }
      : {
          aiFeedback: { state: "ready", value: READY_FEEDBACK },
          score,
          status: "done" as const,
        }),
  });
  return first.id;
}

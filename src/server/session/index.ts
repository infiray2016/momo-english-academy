import "server-only";
// 세션 틀 서버(5절 sessions · attempts · 전이 표 '세션을 여는 서버 액션은 … 다시 판정' · 8절 네트워크 끊김 · 같은 프로필 동시 사용,
// plan-p10b 파일별 값 6 · 위험 4 · 5 · 10 · 정할 것 ㄹ · ㅁ · ㅈ). 세션 시작 재판정 · 판 고르기 · 이전 세션 중단 · 시도 저장 ·
// 첫 활동 '홈' 지움 · 세션 화면 자료. AI 를 가져오지 않는다(AC-1b). 시각은 인자(now)로 받고 질의 SQL 안에 now() 를 쓰지 않는다.
// DB 오류는 이름 · 코드만 로그에 남긴다(시도 입력 글을 내지 않음).
import { and, eq, inArray, max } from "drizzle-orm";
import { z } from "zod";
import type { PictureInfo } from "@/core/answer/display";
import { learningDayOf } from "@/core/learning-day";
import {
  judgeLessonStart,
  type LessonKindRef,
  type StartJudgement,
} from "@/core/lesson-list/state";
import { LESSON_SCHEMAS, type LessonOf } from "@/core/seed/schema/lesson";
import type { Area } from "@/core/seed/structure";
import {
  type Activity,
  activitiesOf,
  type PreviewWord,
  previewWordsOf,
} from "@/core/session/preview";
import { images, lessons, vocab } from "@/db/schema/content";
import {
  attempts,
  profileTracks,
  sessions,
  unitProgress,
} from "@/db/schema/learning";
import { type Db, getDb, type Tx } from "@/server/db";
import { dbErrorTag, isUniqueViolation } from "@/server/db/safe-error";
import { readLessonList } from "@/server/lesson-list";
import { readHouseholdProfile } from "@/server/profile";
import { readLessonsOfUnit, readLevelSpec } from "@/server/seed/read";
import {
  appDayStartHourSchema,
  appTimezoneSchema,
  getSettings,
  SettingMissingError,
} from "@/server/settings";

type LessonArea = Exclude<Area, "talk">;

/** 세션을 여는 수업 칸 종류(목록에 나오는 것). */
const LESSON_KINDS: readonly LessonKindRef[] = [
  "assigned",
  "reinforce",
  "alphabet",
  "remedial",
];
const LESSON_AREAS: readonly LessonArea[] = ["reading", "writing", "speaking"];
const THROUGH_KEY = "seed.complete_through_level";
const NEW_WORDS_KEY = "unit.new_words_per_lesson";
/** 새 단어 미리보기 활동 번호(3.3 첫 활동). */
const PREVIEW_ACTIVITY = 1;

// 시도 입력 상한(기술 값)
/** 한 번에 받는 시도 수. */
const ATTEMPTS_PER_BATCH_MAX = 50;
/** 활동 번호 상한. */
const ACTIVITY_NO_MAX = 200;
/** 시도 입력 JSON 글자 수 상한. */
const INPUT_JSON_MAX = 4000;

const settingSchemas = {
  [THROUGH_KEY]: z.number().int().min(1),
  "app.timezone": appTimezoneSchema,
  "app.day_start_hour": appDayStartHourSchema,
};

const StartInputSchema = z.strictObject({
  lessonId: z.uuid(),
  confirmAbort: z.boolean(),
});

const AttemptSchema = z.strictObject({
  clientAttemptId: z.uuid(),
  sessionId: z.uuid(),
  activityNo: z.int().min(1).max(ACTIVITY_NO_MAX),
  input: z
    .unknown()
    .refine(
      (value) =>
        value !== undefined &&
        (JSON.stringify(value)?.length ?? 0) <= INPUT_JSON_MAX,
    ),
});
const AttemptBatchSchema = z
  .array(AttemptSchema)
  .min(1)
  .max(ATTEMPTS_PER_BATCH_MAX);

const LeaveInputSchema = z.strictObject({
  sessionId: z.uuid(),
  onFirstActivity: z.boolean(),
});

export type SessionDeps = { db?: Db; now: () => Date };

export type StartOutcome =
  | { ok: true; sessionId: string }
  | {
      ok: false;
      reason:
        | Extract<StartJudgement, { ok: false }>["reason"]
        | "needs_confirm"
        | "invalid"
        | "no_profile"
        | "unavailable";
    };

function logFailure(what: string, error: unknown) {
  if (error instanceof SettingMissingError)
    console.error(`${what} 실패(설정 ${error.key} 가 없습니다)`);
  else console.error(`${what} 실패(${dbErrorTag(error)})`);
}

async function inProgressOf(
  db: Db | Tx,
  profileId: string,
  area: LessonArea,
): Promise<string | undefined> {
  const [row] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.profileId, profileId),
        eq(sessions.area, area),
        eq(sessions.status, "in_progress"),
      ),
    );
  return row?.id;
}

/**
 * 세션 시작(5절 '세션을 여는 서버 액션은 고른 수업이 열린 것인지 다시 판정'). 한 트랜잭션: 그 영역 트랙 행 FOR UPDATE(두 기기
 * 동시 시작을 줄 세움) → 수업 목록 입력을 다시 모아 judgeLessonStart → 거부 · 확인 요구 · 이어 하기 · 이전 세션 중단 →
 * 판 · 변형을 서버가 다시 골라(R5) 세션 행. 동시 시작으로 부분 유일 색인에 걸리면 진행 세션을 돌려준다(8절).
 */
export async function startLessonSession(
  raw: unknown,
  { db = getDb(), now }: SessionDeps,
): Promise<StartOutcome> {
  const parsed = StartInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  try {
    return await startUnsafe(parsed.data, db, now());
  } catch (error) {
    if (isUniqueViolation(error)) {
      try {
        const profile = await readHouseholdProfile({ db });
        const [lesson] = await db
          .select({ area: lessons.area })
          .from(lessons)
          .where(eq(lessons.id, parsed.data.lessonId));
        if (profile && lesson && lesson.area !== "talk") {
          const going = await inProgressOf(db, profile.id, lesson.area);
          if (going) return { ok: true, sessionId: going };
        }
      } catch (again) {
        logFailure("세션 시작", again);
      }
    }
    logFailure("세션 시작", error);
    return { ok: false, reason: "unavailable" };
  }
}

async function startUnsafe(
  input: z.infer<typeof StartInputSchema>,
  db: Db,
  at: Date,
): Promise<StartOutcome> {
  const profile = await readHouseholdProfile({ db });
  if (!profile) return { ok: false, reason: "no_profile" };
  const [lesson] = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, input.lessonId));
  if (
    !lesson ||
    lesson.unit === null ||
    !LESSON_AREAS.includes(lesson.area as LessonArea) ||
    !LESSON_KINDS.includes(lesson.kind as LessonKindRef)
  )
    return { ok: false, reason: "unknown" };
  const area = lesson.area as LessonArea;
  const ref = {
    unit: lesson.unit,
    kind: lesson.kind as LessonKindRef,
    lessonNo: lesson.lessonNo,
  };
  const s = await getSettings(settingSchemas, { db, profileId: profile.id });
  const learningDay = learningDayOf(
    at,
    s["app.timezone"],
    s["app.day_start_hour"],
  );

  return db.transaction(async (tx) => {
    // 같은 영역 시작을 줄 세운다(위험 4)
    const [track] = await tx
      .select({ id: profileTracks.id })
      .from(profileTracks)
      .where(
        and(
          eq(profileTracks.profileId, profile.id),
          eq(profileTracks.area, area),
        ),
      )
      .for("update");
    if (!track) return { ok: false, reason: "not_placed" } as const;
    // 목록 입력을 다시 모은다(오래 멈춘 세션 닫기 포함 — 목록과 같은 함수, 위험 3). 같은 트랜잭션 연결로 읽는다 —
    // 잠금을 쥔 채 바깥 연결을 또 받으면 풀이 찰 때 서로 기다린다(검토 review-p10-5-6-code M-1). READ COMMITTED 라 판정은 같다
    const list = await readLessonList({ db: tx, area, now: at });
    if (list.kind !== "list")
      return { ok: false, reason: "not_placed" } as const;
    const judged = judgeLessonStart(
      list.input,
      { level: lesson.level, ref },
      { seedThrough: s[THROUGH_KEY], placed: true },
    );
    if (!judged.ok) return { ok: false, reason: judged.reason } as const;
    if (judged.resume) return { ok: true, sessionId: judged.resume } as const;
    if (judged.abort && !input.confirmAbort)
      return { ok: false, reason: "needs_confirm" } as const;
    if (judged.abort) {
      await tx
        .update(sessions)
        .set({ status: "aborted", learningDay })
        .where(
          and(
            eq(sessions.id, judged.abort),
            eq(sessions.status, "in_progress"),
          ),
        );
    }

    // 판: 지금 · 통과한 단원은 그 단원 회차의 시작 개정, 다시 하기는 처음 쓴 개정(그 개정의 가장 높은 정정)
    const rounds = await tx
      .select()
      .from(unitProgress)
      .where(
        and(
          eq(unitProgress.profileId, profile.id),
          eq(unitProgress.area, area),
          eq(unitProgress.level, lesson.level),
          eq(unitProgress.unit, ref.unit),
        ),
      );
    const round = rounds.sort((a, b) => b.round - a.round)[0];
    if (!round) return { ok: false, reason: "locked_unit" } as const;
    const revision =
      judged.kind === "retry" && judged.firstRevision !== undefined
        ? judged.firstRevision
        : round.startRevision;
    const rows = (
      await readLessonsOfUnit(
        { area, level: lesson.level, unit: ref.unit, startRevision: revision },
        { db: tx },
      )
    )
      .filter((r) => r.kind === ref.kind && r.lessonNo === ref.lessonNo)
      .sort((a, b) => (a.topicVariant ?? 0) - (b.topicVariant ?? 0));
    const wanted =
      judged.variantRule === "first_session" &&
      judged.firstVariant !== undefined
        ? judged.firstVariant
        : Number(profile.topicBundle);
    // 그 변형이 없으면 가장 낮은 변형(정할 것 ㅂ)
    const row = rows.find((r) => r.topicVariant === wanted) ?? rows[0];
    if (!row) return { ok: false, reason: "unknown" } as const;

    const [created] = await tx
      .insert(sessions)
      .values({
        profileId: profile.id,
        area,
        level: lesson.level,
        unit: ref.unit,
        lessonId: row.id,
        kind: judged.kind,
        status: "in_progress",
        startedAt: at,
        seedRevision: row.revision,
        seedCorrection: row.correction,
      })
      .returning({ id: sessions.id });
    if (!created) throw new Error("세션을 넣지 못했다");
    return { ok: true, sessionId: created.id } as const;
  });
}

export type SaveOutcome =
  | { ok: true; accepted: string[] }
  | { ok: false; reason: "invalid" | "no_profile" | "unavailable" };

/**
 * 시도 저장(8절 — 같은 시도 id 는 한 번만). 그 프로필의 진행 세션 시도만 넣고, 받은 id(이미 있던 것 포함)를 돌려준다.
 * 끝나거나 닫힌 세션 · 남의 세션의 늦은 시도는 받은 것으로 치고 버린다(기기 대기열이 비도록, 위험 10).
 */
export async function saveSessionAttempts(
  raw: unknown,
  { db = getDb(), now }: SessionDeps,
): Promise<SaveOutcome> {
  const parsed = AttemptBatchSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false, reason: "no_profile" };
    const ids = [...new Set(parsed.data.map((a) => a.sessionId))];
    const open = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(
        and(
          inArray(sessions.id, ids),
          eq(sessions.profileId, profile.id),
          eq(sessions.status, "in_progress"),
        ),
      );
    const openIds = new Set(open.map((s) => s.id));
    const rows = parsed.data
      .filter((a) => openIds.has(a.sessionId))
      .map((a) => ({
        sessionId: a.sessionId,
        clientAttemptId: a.clientAttemptId,
        activityNo: a.activityNo,
        input: a.input as object,
        attemptedAt: now(),
        status: "done" as const,
      }));
    if (rows.length > 0)
      await db.insert(attempts).values(rows).onConflictDoNothing({
        target: attempts.clientAttemptId,
      });
    return { ok: true, accepted: parsed.data.map((a) => a.clientAttemptId) };
  } catch (error) {
    logFailure("시도 저장", error);
    return { ok: false, reason: "unavailable" };
  }
}

export type LeaveOutcome =
  | { ok: true; deleted: boolean }
  | { ok: false; reason: "invalid" | "no_profile" | "unavailable" };

/**
 * '홈'(5절 전이 '진행 → 지움', AC-2e): 화면이 첫 활동이라고 보냈고 그 진행 세션에 시도가 하나도 없을 때만 세션 행을 지운다.
 * 그 밖은 진행으로 남는다(둘째 활동의 '홈'이 아직 못 보낸 첫 시도와 엇갈려 지우지 않게 두 조건을 함께 본다).
 */
export async function leaveLessonSession(
  raw: unknown,
  { db = getDb() }: SessionDeps,
): Promise<LeaveOutcome> {
  const parsed = LeaveInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  if (!parsed.data.onFirstActivity) return { ok: true, deleted: false };
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false, reason: "no_profile" };
    return await db.transaction(async (tx) => {
      const [session] = await tx
        .select({ id: sessions.id })
        .from(sessions)
        .where(
          and(
            eq(sessions.id, parsed.data.sessionId),
            eq(sessions.profileId, profile.id),
            eq(sessions.status, "in_progress"),
          ),
        )
        .for("update");
      if (!session) return { ok: true, deleted: false } as const;
      const [tried] = await tx
        .select({ id: attempts.id })
        .from(attempts)
        .where(eq(attempts.sessionId, session.id))
        .limit(1);
      if (tried) return { ok: true, deleted: false } as const;
      await tx.delete(sessions).where(eq(sessions.id, session.id));
      return { ok: true, deleted: true } as const;
    });
  } catch (error) {
    logFailure("세션 나가기", error);
    return { ok: false, reason: "unavailable" };
  }
}

// ── 세션 화면 자료 ──

export type SessionView = {
  [A in LessonArea]: {
    sessionId: string;
    area: A;
    level: number;
    unit: number;
    lessonNo: number;
    title: string;
    activities: Activity[];
    /** 지금 활동 번호(1부터) = 저장한 시도의 가장 큰 활동 번호 + 1(활동 수를 넘지 않음). */
    current: number;
    lesson: LessonOf[A];
    preview: PreviewWord[];
    /** 낱말 id → 그림 정보 · 그림 키 → 그림 정보(P5b PictureLookup 을 화면이 만든다). */
    wordPictures: Record<string, PictureInfo>;
    keyPictures: Record<string, PictureInfo>;
    /** 말하기 질문의 한국어 뜻(그 단계 말하기 규격 questions.koMeaning, C39). */
    showKo: boolean;
  };
}[LessonArea];

function pictureWordsOf(lesson: LessonOf[LessonArea]): {
  words: string[];
  keys: string[];
} {
  const words = new Set<string>(lesson.newWords);
  const keys = new Set<string>();
  const c = lesson.content as Record<string, unknown>;
  if ("questions" in c && Array.isArray(c.questions)) {
    for (const q of c.questions as { kind?: string; options?: string[] }[])
      if (q.kind === "picture") for (const w of q.options ?? []) words.add(w);
  }
  if ("items" in c && Array.isArray(c.items)) {
    for (const item of c.items as {
      type: string;
      picture?: string;
      word?: string;
    }[]) {
      if (item.type === "pick-word" && item.picture) words.add(item.picture);
      if (item.type === "fill-letters" && item.word) words.add(item.word);
    }
  }
  if ("listening" in c && Array.isArray(c.listening)) {
    for (const l of c.listening as { kind: string; options: string[] }[])
      if (l.kind === "picture") for (const w of l.options) words.add(w);
  }
  const task = c.pictureTask as { images?: string[] } | undefined;
  for (const key of task?.images ?? []) keys.add(key);
  return { words: [...words], keys: [...keys] };
}

const toPicture = (meaningKo: string, path: string | null): PictureInfo => ({
  meaningKo,
  catalogued: path !== null,
  ...(path ? { src: path.startsWith("/") ? path : `/${path}` } : {}),
});

/** 세션 화면 자료. 그 프로필의 진행 세션이 아니면 undefined(쪽이 수업 목록으로 보낸다). */
export async function loadSessionView(
  { sessionId }: { sessionId: string },
  { db = getDb() }: SessionDeps,
): Promise<SessionView | undefined> {
  if (!z.uuid().safeParse(sessionId).success) return undefined;
  const profile = await readHouseholdProfile({ db });
  if (!profile) return undefined;
  const [row] = await db
    .select({ session: sessions, lesson: lessons })
    .from(sessions)
    .innerJoin(lessons, eq(lessons.id, sessions.lessonId))
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.profileId, profile.id),
        eq(sessions.status, "in_progress"),
      ),
    );
  if (!row || row.session.area === "talk" || row.session.unit === null)
    return undefined;
  const area = row.session.area;
  const level = row.session.level ?? row.lesson.level;
  const unit = row.session.unit;
  // 진행 세션은 lesson_id 행을 끝까지 쓴다(5절)
  const lesson = LESSON_SCHEMAS[area].parse(
    row.lesson.content,
  ) as LessonOf[typeof area];
  const activities = activitiesOf(area, lesson.content);

  const [done] = await db
    .select({ n: max(attempts.activityNo) })
    .from(attempts)
    .where(eq(attempts.sessionId, sessionId));
  const current = Math.min(
    Math.max(PREVIEW_ACTIVITY, Number(done?.n ?? 0) + 1),
    Math.max(PREVIEW_ACTIVITY, activities.length),
  );

  // 만난 단어(정할 것 ㄹ): 이 영역 다른 세션의 미리보기 시도에 보인 단어
  const shownRows = await db
    .select({ input: attempts.input })
    .from(attempts)
    .innerJoin(sessions, eq(sessions.id, attempts.sessionId))
    .where(
      and(
        eq(sessions.profileId, profile.id),
        eq(sessions.area, area),
        eq(attempts.activityNo, PREVIEW_ACTIVITY),
      ),
    );
  const metWords = shownRows.flatMap((r) => {
    const words = (r.input as { shownWords?: unknown } | null)?.shownWords;
    return Array.isArray(words)
      ? words.filter((w): w is string => typeof w === "string")
      : [];
  });

  // k: 그 단원 회차 복사본(12절 머리 — 단원 시작 때의 값)
  const [round] = await db
    .select({ snapshot: unitProgress.settingsSnapshot })
    .from(unitProgress)
    .where(
      and(
        eq(unitProgress.profileId, profile.id),
        eq(unitProgress.area, area),
        eq(unitProgress.level, level),
        eq(unitProgress.unit, unit),
      ),
    );
  const k = (round?.snapshot as Record<string, unknown> | undefined)?.[
    NEW_WORDS_KEY
  ];
  if (typeof k !== "number")
    throw new Error(`단원 복사본에 ${NEW_WORDS_KEY} 가 없다`);

  const { words, keys } = pictureWordsOf(lesson);
  const lookupWords = [...new Set([...words, ...lesson.unitWords])];
  const vocabRows =
    lookupWords.length > 0
      ? await db
          .select({
            word: vocab.word,
            meaning: vocab.meaning,
            example: vocab.example,
            path: images.path,
          })
          .from(vocab)
          .leftJoin(images, eq(images.key, vocab.imageKey))
          .where(inArray(vocab.word, lookupWords))
      : [];
  const byWord = new Map(vocabRows.map((v) => [v.word, v]));
  const preview = previewWordsOf({
    lesson,
    metWords,
    knownWords: [],
    k,
    vocab: (word) => {
      const v = byWord.get(word);
      return v ? { meaningKo: v.meaning, example: v.example ?? "" } : undefined;
    },
  });
  const wordPictures = Object.fromEntries(
    words.map((w) => {
      const v = byWord.get(w);
      return [w, toPicture(v?.meaning ?? w, v?.path ?? null)];
    }),
  );
  const keyRows =
    keys.length > 0
      ? await db
          .select({ key: images.key, path: images.path, word: images.word })
          .from(images)
          .where(inArray(images.key, keys))
      : [];
  const keyPictures = Object.fromEntries(
    keys.map((key) => {
      const image = keyRows.find((r) => r.key === key);
      return [key, toPicture(image?.word ?? key, image?.path ?? null)];
    }),
  );

  let showKo = false;
  if (area === "speaking") {
    const spec = await readLevelSpec(
      {
        area,
        level,
        startRevision: row.session.seedRevision ?? row.lesson.revision,
      },
      { db },
    );
    showKo =
      (spec?.spec as { questions?: { koMeaning?: unknown } } | undefined)
        ?.questions?.koMeaning === true;
  }

  return {
    sessionId,
    area,
    level,
    unit,
    lessonNo: row.lesson.lessonNo,
    title: row.lesson.listTitle,
    activities,
    current,
    lesson,
    preview,
    wordPictures,
    keyPictures,
    showKo,
  } as SessionView;
}

/** 그 프로필 세션의 영역(진행이 아닌 세션 쪽을 열었을 때 수업 목록으로 보낼 곳). 없으면 undefined. */
export async function readSessionArea(
  { sessionId }: { sessionId: string },
  { db = getDb() }: { db?: Db } = {},
): Promise<LessonArea | undefined> {
  if (!z.uuid().safeParse(sessionId).success) return undefined;
  const profile = await readHouseholdProfile({ db });
  if (!profile) return undefined;
  const [row] = await db
    .select({ area: sessions.area })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.profileId, profile.id)));
  return row && row.area !== "talk" ? row.area : undefined;
}

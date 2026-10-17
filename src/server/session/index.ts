import "server-only";
// 세션 틀 서버(5절 sessions · attempts · 전이 표 '세션을 여는 서버 액션은 … 다시 판정' · 8절 네트워크 끊김 · 같은 프로필 동시 사용,
// plan-p10b 파일별 값 6 · 위험 4 · 5 · 10 · 정할 것 ㄹ · ㅁ · ㅈ, plan-p11a 파일별 값 5 · 위험 2 · 4). 세션 시작 재판정 · 판 고르기 ·
// 이전 세션 중단 · 시도 저장(시도마다 꼴 검사 · 서버 다시 채점) · 끝내기 · 첫 활동 '홈' 지움 · 세션 화면 자료.
// AI 를 가져오지 않는다(AC-1b). 시각은 인자(now)로 받고 질의 SQL 안에 now() 를 쓰지 않는다.
// DB 오류는 이름 · 코드만 로그에 남긴다(시도 입력 · 인식 글을 내지 않음, safe-error).
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { PictureInfo } from "@/core/answer/display";
import { learningDayOf } from "@/core/learning-day";
import {
  judgeLessonStart,
  type LessonKindRef,
  type StartJudgement,
} from "@/core/lesson-list/state";
import { sessionScoreOf } from "@/core/scoring/score";
import { LESSON_SCHEMAS, type LessonOf } from "@/core/seed/schema/lesson";
import type { Area } from "@/core/seed/structure";
import {
  type AppScoringContext,
  ATTEMPTS_PER_BATCH_MAX,
  type AttemptInput,
  appActivityResult,
  finalActivityNos,
  inputFitsActivity,
  lemmaLookup,
  parseAttemptInput,
  resumePointOf,
} from "@/core/session/attempt";
import {
  type Activity,
  type ActivityModelInput,
  activitiesOf,
  type PreviewWord,
  previewWordsOf,
} from "@/core/session/preview";
import {
  answerMaxSecondsKey,
  answerShapeOf,
  englishSentencesOf,
  type SpeechActivityKind,
} from "@/core/speaking/judge";
import {
  type AnswerShape,
  SPEECH_SETTING_KEYS,
  type SpeechSettings,
  speechSettingsFrom,
} from "@/core/speech/listen";
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
import { loadSeedList, SeedListError } from "@/server/seed-lists";
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

// 시도 입력 상한(기술 값 — 묶음 수 · JSON 글자 수는 core/session/attempt 의 상수를 대기열과 같이 쓴다)
/** 활동 번호 상한. */
const ACTIVITY_NO_MAX = 200;
/** 말하기 활동 종류(답 꼴을 넘기는 활동). */
const SPEECH_KINDS: ReadonlySet<string> = new Set<SpeechActivityKind>([
  "repeat-word",
  "repeat-sentence",
  "question",
  "picture-task",
  "presentation",
  "confirm-question",
]);

const settingSchemas = {
  [THROUGH_KEY]: z.number().int().min(1),
  "app.timezone": appTimezoneSchema,
  "app.day_start_hour": appDayStartHourSchema,
};

const StartInputSchema = z.strictObject({
  lessonId: z.uuid(),
  confirmAbort: z.boolean(),
});

/** 시도 하나의 겉꼴(입력 내용은 parseAttemptInput 이 본다). */
const AttemptSchema = z.strictObject({
  clientAttemptId: z.uuid(),
  sessionId: z.uuid(),
  activityNo: z.int().min(1).max(ACTIVITY_NO_MAX),
  input: z.unknown(),
});
/** 묶음: 시도마다 시도 id 글이 있어야 한다(거부를 그 id 로 돌려준다). 시도 id 조차 없으면 묶음이 꼴이 틀림. */
const AttemptBatchSchema = z
  .array(z.looseObject({ clientAttemptId: z.string().min(1) }))
  .min(1)
  .max(ATTEMPTS_PER_BATCH_MAX);
const FinishInputSchema = z.strictObject({ sessionId: z.uuid() });

const LeaveInputSchema = z.strictObject({
  sessionId: z.uuid(),
  onFirstActivity: z.boolean(),
});

export type SessionDeps = {
  db?: Db;
  now: () => Date;
  /** 동음이의어 묶음(시드 lists/homophones.json). 시험이 바꾼다. */
  homophones?: () => string[][];
};

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

// ── 세션 활동 · 설정 · 채점 바탕(저장 · 끝내기 · 화면 자료가 같이 쓴다 — 위험 2) ──

type SessionRow = typeof sessions.$inferSelect;
type LessonRow = typeof lessons.$inferSelect;

/** 목록 없음 알림을 한 번만 냈는가(서버 인스턴스마다). */
let homophonesMissingWarned = false;

/**
 * 동음이의어 묶음(P9c loadSeedList — P10 배치와 같은 꼴). 시드 목록 파일이 없는 개발용 · e2e 길(시험용 시드는 DB 에만 있음)은
 * 빈 묶음으로 보고 처음 한 번 경고를 남긴다(이름만). 규격이 틀린 파일은 던진다.
 */
function seedHomophones(): string[][] {
  try {
    return loadSeedList("homophones").groups;
  } catch (error) {
    if (error instanceof SeedListError && error.reason === "missing") {
      if (!homophonesMissingWarned) {
        homophonesMissingWarned = true;
        console.warn(
          "동음이의어 목록(seed/lists/homophones.json)이 없어 빈 묶음으로 채점합니다",
        );
      }
      return [];
    }
    throw error;
  }
}

/** 세션 화면 · 채점 · 끝내기가 쓰는 설정(12절 speech.* · ui.* · speaking.* · writing.thinkout_from_level). */
export type SessionConfig = {
  speech: SpeechSettings;
  /** speech.max_retries */
  maxRetries: number;
  /** speech.silent_items_max */
  silentItemsMax: number;
  ui: {
    waitHintSeconds: [number, number];
    matchPhraseLevels: [number, number];
    autoNextSeconds: number;
  };
  speaking: {
    answerMatchPass: number;
    /** 그 단계 구간의 두 문장 이상 답 시간 상한(speaking.answer_max_seconds.<구간>). */
    answerMaxSeconds: number;
    prepareSeconds: number;
  };
};
type SessionSettings = SessionConfig & {
  weights: { a: number; L: number };
  thinkoutFromLevel: number;
};

const unitInterval = z.number().min(0).max(1);

async function readSessionSettings(
  db: Db | Tx,
  profileId: string,
  level: number,
): Promise<SessionSettings> {
  const capKey = answerMaxSecondsKey(level);
  const values = await getSettings(
    {
      ...Object.fromEntries(
        SPEECH_SETTING_KEYS.map((key) => [key, z.unknown()]),
      ),
      "speech.max_retries": z.int().min(1),
      "speech.silent_items_max": z.int().min(1),
      "ui.wait_hint_seconds": z.tuple([
        z.number().positive(),
        z.number().positive(),
      ]),
      "ui.match_phrase_levels": z.tuple([unitInterval, unitInterval]),
      "ui.auto_next_seconds": z.number().nonnegative(),
      "speaking.answer_match_pass": unitInterval,
      "speaking.prepare_seconds": z.number().positive(),
      "speaking.match_weight": unitInterval,
      "speaking.listening_weight": unitInterval,
      "writing.thinkout_from_level": z.int().min(1),
      [capKey]: z.number().positive(),
    } as Record<string, z.ZodType>,
    { db, profileId },
  );
  const num = (key: string) => values[key] as number;
  const pair = (key: string) => values[key] as [number, number];
  return {
    speech: speechSettingsFrom((key) => values[key]),
    maxRetries: num("speech.max_retries"),
    silentItemsMax: num("speech.silent_items_max"),
    ui: {
      waitHintSeconds: pair("ui.wait_hint_seconds"),
      matchPhraseLevels: pair("ui.match_phrase_levels"),
      autoNextSeconds: num("ui.auto_next_seconds"),
    },
    speaking: {
      answerMatchPass: num("speaking.answer_match_pass"),
      answerMaxSeconds: num(capKey),
      prepareSeconds: num("speaking.prepare_seconds"),
    },
    weights: {
      a: num("speaking.match_weight"),
      L: num("speaking.listening_weight"),
    },
    thinkoutFromLevel: num("writing.thinkout_from_level"),
  };
}

/** 단계 규격에서 세션이 쓰는 칸(말하기 질문 · 발표). */
type SpecBits = {
  questions?: {
    acceptedMin?: number;
    koMeaning?: boolean;
    answerSentences?: { max: number };
  };
  presentation?: { confirmQuestions?: number };
};

type SessionContext = {
  area: LessonArea;
  level: number;
  lesson: LessonOf[LessonArea];
  activities: Activity[];
  settings: SessionSettings;
  spec: SpecBits;
  /** 말하기 질문 답을 앱이 판정하는가(level_specs questions.acceptedMin > 0 — 1~2단계, C38 · C66). */
  appJudged: boolean;
};

/** 진행 세션 행과 그 수업 행으로 활동 차례 · 설정 · 규격을 모은다(활동 모델 값 1 — 서버 · 화면이 같은 목록). */
async function sessionContextOf(
  db: Db | Tx,
  session: SessionRow,
  lessonRow: LessonRow,
  profileId: string,
): Promise<SessionContext> {
  const area = session.area as LessonArea;
  const level = session.level ?? lessonRow.level;
  // 진행 세션은 lesson_id 행을 끝까지 쓴다(5절)
  const lesson = LESSON_SCHEMAS[area].parse(
    lessonRow.content,
  ) as LessonOf[LessonArea];
  const settings = await readSessionSettings(db, profileId, level);
  const specRow = await readLevelSpec(
    {
      area,
      level,
      startRevision: session.seedRevision ?? lessonRow.revision,
    },
    { db },
  );
  const spec = (specRow?.spec ?? {}) as SpecBits;
  const appJudged =
    area === "speaking" && (spec.questions?.acceptedMin ?? 0) > 0;
  const activities = activitiesOf({
    area,
    level,
    content: lesson.content,
    part: session.writingPart ?? undefined,
    thinkout: level >= settings.thinkoutFromLevel,
    // 둘째 세션의 교정 수는 첨삭이 오면 b 가 채운다
    corrections: 0,
    confirmQuestions: spec.presentation?.confirmQuestions ?? 0,
  } as ActivityModelInput);
  return { area, level, lesson, activities, settings, spec, appJudged };
}

/** 단원 단어의 원형 표 자료(vocab word · forms). */
async function lemmaEntriesOf(
  db: Db | Tx,
  words: readonly string[],
): Promise<{ word: string; forms: string[] }[]> {
  if (words.length === 0) return [];
  const rows = await db
    .select({ word: vocab.word, forms: vocab.forms })
    .from(vocab)
    .where(inArray(vocab.word, [...words]));
  return rows.map((r) => ({
    word: r.word,
    forms: Array.isArray(r.forms)
      ? r.forms.filter((f): f is string => typeof f === "string")
      : [],
  }));
}

function scoringOf(
  ctx: SessionContext,
  homophones: string[][],
  lemmaEntries: readonly { word: string; forms: string[] }[],
): AppScoringContext {
  return {
    answerMatchPass: ctx.settings.speaking.answerMatchPass,
    homophones,
    unitWords: ctx.lesson.unitWords,
    lemmaOf: lemmaLookup(lemmaEntries),
    appJudgedQuestions: ctx.appJudged,
  };
}

/**
 * AI 활동의 끝 시도는 이 길로 받지 않는다 — b · c 서버 액션이 AI 결과와 함께 저장한다. 3단계부터의 질문 답은 AI 판정이라
 * AI 결과 없이 건너뛴 끝 시도만 받는다(c 값 3). a 몫 밖 종류는 시도 꼴(parseAttemptInput)에서 이미 걸러진다.
 */
function needsAiPath(input: AttemptInput, ctx: SessionContext): boolean {
  return (
    input.kind === "question" &&
    !ctx.appJudged &&
    input.step === "final" &&
    input.skipped === undefined
  );
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
  | { ok: true; accepted: string[]; rejected: string[] }
  | { ok: false; reason: "invalid" | "no_profile" | "unavailable" };

/**
 * 시도 저장(8절 — 같은 시도 id 는 한 번만, plan-p11a 값 5). 묶음을 통째로 거부하지 않고 시도마다 겉꼴 · 입력 꼴(값 2) · 활동 종류를 본다.
 * 꼴이 틀린 시도 id 는 rejected 로 돌려준다(기기 대기열이 지운다 — 장부 M-2). 받은 시도는 그 세션의 수업 내용으로 다시 채점해
 * score · word_results · word_count 를 쓴다(서버 값이 정본, 화면이 보낸 점수 칸은 꼴이 틀림). 끝나거나 닫힌 세션 · 남의 세션의
 * 늦은 시도는 받은 것으로 치고 버린다(기기 대기열이 비도록, 위험 10).
 */
export async function saveSessionAttempts(
  raw: unknown,
  { db = getDb(), now, homophones = seedHomophones }: SessionDeps,
): Promise<SaveOutcome> {
  const batch = AttemptBatchSchema.safeParse(raw);
  if (!batch.success) return { ok: false, reason: "invalid" };
  const accepted: string[] = [];
  const rejected: string[] = [];
  const valid: {
    attempt: z.infer<typeof AttemptSchema>;
    input: AttemptInput;
  }[] = [];
  for (const item of batch.data) {
    const attempt = AttemptSchema.safeParse(item);
    const input = attempt.success
      ? parseAttemptInput(attempt.data.input)
      : undefined;
    if (!attempt.success || !input) rejected.push(item.clientAttemptId);
    else valid.push({ attempt: attempt.data, input });
  }
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false, reason: "no_profile" };
    const ids = [...new Set(valid.map((v) => v.attempt.sessionId))];
    const open =
      ids.length > 0
        ? await db
            .select({ session: sessions, lesson: lessons })
            .from(sessions)
            .innerJoin(lessons, eq(lessons.id, sessions.lessonId))
            .where(
              and(
                inArray(sessions.id, ids),
                eq(sessions.profileId, profile.id),
                eq(sessions.status, "in_progress"),
              ),
            )
        : [];
    const contexts = new Map<
      string,
      { ctx: SessionContext; scoring: AppScoringContext }
    >();
    const groups = homophones();
    for (const { session, lesson } of open) {
      if (session.area === "talk") continue;
      const ctx = await sessionContextOf(db, session, lesson, profile.id);
      const lemmas = await lemmaEntriesOf(db, ctx.lesson.unitWords);
      contexts.set(session.id, {
        ctx,
        scoring: scoringOf(ctx, groups, lemmas),
      });
    }
    const at = now();
    const rows: (typeof attempts.$inferInsert)[] = [];
    for (const { attempt, input } of valid) {
      const found = contexts.get(attempt.sessionId);
      if (!found) {
        accepted.push(attempt.clientAttemptId);
        continue;
      }
      const activity = found.ctx.activities[attempt.activityNo - 1];
      if (
        !activity ||
        !inputFitsActivity(activity, input) ||
        needsAiPath(input, found.ctx)
      ) {
        rejected.push(attempt.clientAttemptId);
        continue;
      }
      const result = appActivityResult(
        activity,
        found.ctx.lesson,
        input,
        found.scoring,
      );
      rows.push({
        sessionId: attempt.sessionId,
        clientAttemptId: attempt.clientAttemptId,
        activityNo: attempt.activityNo,
        input,
        attemptedAt: at,
        status: "done",
        score: result.score,
        // 비울 수 있는 jsonb 에는 JSON null 을 넣지 않는다(칸을 비움)
        ...(result.wordResults.length > 0
          ? { wordResults: result.wordResults }
          : {}),
        wordCount: result.wordCount,
      });
      accepted.push(attempt.clientAttemptId);
    }
    if (rows.length > 0)
      await db.insert(attempts).values(rows).onConflictDoNothing({
        target: attempts.clientAttemptId,
      });
    if (rejected.length > 0)
      console.warn(`시도 ${rejected.length}개를 꼴이 틀려 받지 않았습니다`);
    return { ok: true, accepted, rejected };
  } catch (error) {
    logFailure("시도 저장", error);
    return { ok: false, reason: "unavailable" };
  }
}

export type FinishOutcome =
  | { ok: true; already: boolean }
  | { ok: false; reason: "incomplete"; missing: number[] }
  | {
      ok: false;
      reason: "invalid" | "no_profile" | "not_found" | "closed" | "unavailable";
    };

/** 끝 시도 행(활동 번호마다 가장 먼저 저장된 것). */
function finalRowsOf(
  rows: readonly (typeof attempts.$inferSelect)[],
): Map<number, { row: typeof attempts.$inferSelect; input: AttemptInput }> {
  const out = new Map<
    number,
    { row: typeof attempts.$inferSelect; input: AttemptInput }
  >();
  const sorted = [...rows].sort(
    (a, b) => a.attemptedAt.getTime() - b.attemptedAt.getTime(),
  );
  for (const row of sorted) {
    const input = parseAttemptInput(row.input);
    if (input?.step === "final" && !out.has(row.activityNo))
      out.set(row.activityNo, { row, input });
  }
  return out;
}

/**
 * 세션 끝내기(plan-p11a 값 5 · 5절 전이 '진행 → 완료'). 한 트랜잭션: 세션 행 FOR UPDATE → 활동 1..n 의 끝 시도가 다 있는지
 * (없으면 incomplete · 빠진 번호 — 화면이 대기열을 비운 뒤 다시 부름) → 3.7 세션 점수 · 영어로 말한 문장 수 · 끝낸 학습일
 * (C56 (1)) · 완료 시각. 끝난 세션은 already(두 번 불러도 같다), 남의 세션 · 없는 세션은 not_found, 중단된 세션은 closed.
 * 쓰기 6~12 첫 세션은 이 길이 아니라 b 의 초고 제출이 끝낸다.
 */
export async function finishLessonSession(
  raw: unknown,
  { db = getDb(), now }: SessionDeps,
): Promise<FinishOutcome> {
  const parsed = FinishInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false, reason: "no_profile" };
    const at = now();
    return await db.transaction(async (tx): Promise<FinishOutcome> => {
      const [session] = await tx
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.id, parsed.data.sessionId),
            eq(sessions.profileId, profile.id),
          ),
        )
        .for("update");
      if (!session || session.area === "talk" || !session.lessonId)
        return { ok: false, reason: "not_found" };
      if (session.status === "completed") return { ok: true, already: true };
      if (session.status !== "in_progress")
        return { ok: false, reason: "closed" };
      const [lessonRow] = await tx
        .select()
        .from(lessons)
        .where(eq(lessons.id, session.lessonId));
      if (!lessonRow) return { ok: false, reason: "not_found" };
      const ctx = await sessionContextOf(tx, session, lessonRow, profile.id);
      const rows = await tx
        .select()
        .from(attempts)
        .where(eq(attempts.sessionId, session.id));
      const finals = finalRowsOf(rows);
      const missing = ctx.activities
        .map((_, i) => i + 1)
        .filter((no) => !finals.has(no));
      if (missing.length > 0)
        return { ok: false, reason: "incomplete", missing };

      const scored = ctx.activities.map((activity, i) => ({
        kind: activity.kind,
        score: finals.get(i + 1)?.row.score ?? null,
      }));
      const content = ctx.lesson.content as { shape?: unknown };
      const score =
        ctx.area === "reading"
          ? sessionScoreOf({ area: "reading", activities: scored })
          : ctx.area === "writing"
            ? sessionScoreOf({
                area: "writing",
                shape: content.shape as "items" | "guided" | "composition",
                ...(session.writingPart ? { part: session.writingPart } : {}),
                activities: scored,
              })
            : sessionScoreOf({
                area: "speaking",
                activities: scored,
                weights: ctx.settings.weights,
              });
      const englishSentences =
        ctx.area === "speaking"
          ? englishSentencesOf([...finals.values()].map((f) => f.input))
          : 0;
      const s = await getSettings(
        {
          "app.timezone": appTimezoneSchema,
          "app.day_start_hour": appDayStartHourSchema,
        },
        { db: tx, profileId: profile.id },
      );
      await tx
        .update(sessions)
        .set({
          status: "completed",
          completedAt: at,
          learningDay: learningDayOf(
            at,
            s["app.timezone"],
            s["app.day_start_hour"],
          ),
          score,
          englishSentences,
        })
        .where(
          and(eq(sessions.id, session.id), eq(sessions.status, "in_progress")),
        );
      return { ok: true, already: false };
    });
  } catch (error) {
    logFailure("세션 끝내기", error);
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
    /** 지금 활동 번호(1부터) = 서버에 끝 시도가 없는 가장 앞 활동(모두 있으면 마지막 활동). 화면이 기기 대기열을 합쳐 다시 센다. */
    current: number;
    /** 서버에 끝 시도가 있는 활동 번호. */
    finals: number[];
    config: SessionConfig;
    /** 동음이의어 묶음(화면 판정이 서버와 같게 — 위험 2). */
    homophones: string[][];
    /** 단원 단어의 원형 표 자료(vocab word · forms). */
    lemmaEntries: { word: string; forms: string[] }[];
    /** 말하기 질문 답을 앱이 판정하는가(level_specs questions.acceptedMin > 0). */
    appJudged: boolean;
    /** 활동마다 말로 답하는 꼴(말하기 활동만, 그 밖은 null — 값 4). */
    answerShapes: (AnswerShape | null)[];
    /** 그 프로필의 진행 세션 id(이 기기의 활동 안 입력에서 남길 줄 — 검토 review-p11-2-code M-1). */
    openSessionIds: string[];
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
      // 맞았을 때 낱말 · 뜻 두 줄(목업 B_W1_Words)의 뜻도 같은 표에서 찾는다(차례 3)
      if (item.word) words.add(item.word);
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

/** 세션 화면 자료. 그 프로필의 진행 세션이 아니면 undefined(쪽이 결과 · 수업 목록으로 보낸다). */
export async function loadSessionView(
  { sessionId }: { sessionId: string },
  { db = getDb(), homophones = seedHomophones }: SessionDeps,
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
  const ctx = await sessionContextOf(db, row.session, row.lesson, profile.id);
  const { area, level, lesson, activities } = ctx;
  const unit = row.session.unit;

  // 이어 할 자리: 끝 시도가 없는 가장 앞 활동(값 2 — 진행 시도는 자리를 옮기지 않음)
  const tried = await db
    .select({ activityNo: attempts.activityNo, input: attempts.input })
    .from(attempts)
    .where(eq(attempts.sessionId, sessionId));
  const finals = finalActivityNos(tried);
  const point = resumePointOf(activities, finals);
  const current =
    "next" in point
      ? point.next
      : Math.max(PREVIEW_ACTIVITY, activities.length);

  // 만난 단어(정할 것 ㄹ): 이 영역 다른 세션의 미리보기 시도에 보인 단어(P10 꼬리표 없는 시도 · 새 꼴 둘 다)
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
    const input = parseAttemptInput(r.input);
    return input?.kind === "preview" ? input.shownWords : [];
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
  const showKo = area === "speaking" && ctx.spec.questions?.koMeaning === true;
  const answerShapes = activities.map((activity) =>
    area === "speaking" && SPEECH_KINDS.has(activity.kind)
      ? answerShapeOf(activity as { kind: SpeechActivityKind }, {
          questions: ctx.spec.questions ?? {},
        })
      : null,
  );
  const {
    weights: _weights,
    thinkoutFromLevel: _from,
    ...config
  } = ctx.settings;
  const open = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.profileId, profile.id),
        eq(sessions.status, "in_progress"),
      ),
    );

  return {
    sessionId,
    area,
    level,
    unit,
    lessonNo: row.lesson.lessonNo,
    title: row.lesson.listTitle,
    activities,
    current,
    finals,
    config,
    homophones: homophones(),
    lemmaEntries: await lemmaEntriesOf(db, lesson.unitWords),
    appJudged: ctx.appJudged,
    answerShapes,
    openSessionIds: open.map((o) => o.id),
    lesson,
    preview,
    wordPictures,
    keyPictures,
    showKo,
  } as SessionView;
}

/** 진행이 아닌 세션 쪽을 열었을 때 보낼 곳: 끝난 세션은 결과, 그 밖 그 프로필 세션은 그 영역 수업 목록. 없으면 undefined. */
export async function readSessionPlace(
  { sessionId }: { sessionId: string },
  { db = getDb() }: { db?: Db } = {},
): Promise<{ area: LessonArea; completed: boolean } | undefined> {
  if (!z.uuid().safeParse(sessionId).success) return undefined;
  const profile = await readHouseholdProfile({ db });
  if (!profile) return undefined;
  const [row] = await db
    .select({ area: sessions.area, status: sessions.status })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.profileId, profile.id)));
  return row && row.area !== "talk"
    ? { area: row.area, completed: row.status === "completed" }
    : undefined;
}

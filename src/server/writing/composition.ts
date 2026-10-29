import "server-only";
import { and, eq, isNull, or, sql } from "drizzle-orm";
// 쓰기 6~12 첫 세션 서버 함수(3.3 쓰기 6~12 행 · 생각 꺼내기 문단 · 6.2 생각 꺼내기 · 쓰기 첨삭 행 · 8절 '첨삭 대기' · '안전 분류기 거절' ·
// 10절 운영(첨삭은 응답 뒤 after()) · 3.7 쓰기 6~12 행, plan-p11b 파일별 값 3 · 5 · 'AI 실패 갈래별 화면 길' 생각 꺼내기 · 첨삭 행 · 위험 2 · 4,
// 13절 C79 · C80 · C86). 생각 꺼내기 턴 · 초고 제출 · 첨삭(응답 뒤) · 첨삭 상태. AI 는 P9c 공개 함수(@/server/ai)로만 부른다.
// 같은 시도 id(또는 같은 턴 · 같은 활동의 끝 시도)가 있으면 저장한 결과를 그대로 돌려준다. 아이에게 돌려주는 AI 글의 {NAME} 은 프로필
// 영어 이름으로 채우고(fillNameDeep — 차례 5 쓰기 확인과 같은 자리), 저장은 가린 글 그대로다(6.1). 아이 글 · AI 글은 로그 · 오류 ·
// 알림 값에 넣지 않는다(이름 · 코드만). 시각은 deps 에서 읽고 질의 SQL 안에 now() 를 쓰지 않는다.
import { after } from "next/server";
import { z } from "zod";
import type { ThinkoutOutput } from "@/core/ai/calls/thinkout";
import type { WritingFeedbackOutput } from "@/core/ai/calls/writing";
import { fillNameDeep } from "@/core/ai/mask";
import { learningDayOf } from "@/core/learning-day";
import { LESSON_SCHEMAS, type LessonOf } from "@/core/seed/schema/lesson";
import { AI_WAIT_TIMEOUT_MULTIPLE } from "@/core/seed/structure";
import {
  type AttemptInput,
  INPUT_VERSION,
  parseAttemptInput,
} from "@/core/session/attempt";
import { type Activity, activitiesOf } from "@/core/session/preview";
import {
  DRAFT_TEXT_MAX,
  type FeedbackState,
  feedbackStateOf,
  nextFeedbackState,
  rubricScore,
  THINKOUT_ANSWER_MAX,
} from "@/core/writing/feedback";
import { lessons } from "@/db/schema/content";
import { attempts, sessions } from "@/db/schema/learning";
import {
  type AiDeps,
  type AiOutcome,
  thinkoutTurn,
  writeFeedback,
} from "@/server/ai";
import { createAlertOnce } from "@/server/ai/store";
import { now as appNow } from "@/server/clock";
import { type Db, getDb } from "@/server/db";
import { dbErrorTag } from "@/server/db/safe-error";
import { readHouseholdProfile } from "@/server/profile";
import { type StartOutcome, startLessonSession } from "@/server/session";
import { levelContextOf } from "@/server/session/ai-context";
import {
  appDayStartHourSchema,
  appTimezoneSchema,
  getSettings,
} from "@/server/settings";
import {
  type DraftFeedback,
  draftFeedbackOf,
  rewriteSourceOf,
} from "@/server/writing/status";

/** 활동 번호 상한(세션 서버의 시도 겉꼴과 같은 기술 값). */
const ACTIVITY_NO_MAX = 200;
/** 서버에서 던진 실패의 까닭(8절 표 '서버 오류' 갈래). */
const SERVER_ERROR_REASON = "error";
/** 초 → ms(단위 바꿈 상수). */
const MS_PER_SECOND = 1000;
/** 첨삭 못 함 알림 종류(P9c AI_ALERT_KINDS). */
const FEEDBACK_FAILED = "feedback_failed";

export type CompositionDeps = AiDeps & {
  now?: () => Date;
  /** 응답 뒤에 할 일(기본 Next after() — 시험은 바로 돌리거나 모아 둔다, 위험 4). */
  schedule?: (task: () => Promise<void>) => void;
};

const base = {
  sessionId: z.uuid(),
  clientAttemptId: z.uuid(),
  activityNo: z.int().min(1).max(ACTIVITY_NO_MAX),
};
const ThinkoutStepSchema = z.strictObject({
  ...base,
  /** 앞 질문의 답(첫 턴은 null) — 보기 글 또는 한글로 짧게 쓴 글. */
  answer: z.string().trim().min(1).max(THINKOUT_ANSWER_MAX).nullable(),
});
const DraftSchema = z.strictObject({
  ...base,
  text: z.string().max(DRAFT_TEXT_MAX),
});
const StatusSchema = z.strictObject({ sessionId: z.uuid() });

/** 생각 꺼내기 한 턴의 결과(화면 글의 {NAME} 은 채움). */
export type ThinkoutOutcome =
  | { ok: true; done: false; turn: number; question: string; options: string[] }
  | {
      ok: true;
      done: true;
      summary: string;
      words: string[];
      starters: string[];
    }
  | {
      ok: false;
      reason:
        | "fallback" // 실패 · 출력 막힘 — '이번에는 바로 써 볼까요' 초고 화면(8절)
        | "ai_resting" // 1-가 하루 안전 상한(시도 없음 · 세션 진행)
        | "invalid"
        | "not_found"
        | "unavailable";
    };

export type DraftOutcome =
  | { ok: true; resultPath: string }
  | { ok: false; reason: "incomplete"; missing: number[] }
  | { ok: false; reason: "invalid" | "not_found" | "unavailable" };

type SessionRow = typeof sessions.$inferSelect;
type CompositionSession = {
  session: SessionRow;
  lesson: LessonOf["writing"];
  content: Extract<LessonOf["writing"]["content"], { shape: "composition" }>;
  level: number;
  unit: number;
  activities: Activity[];
};

function logFailure(what: string, error: unknown): void {
  console.error(`${what} 실패(${dbErrorTag(error)})`);
}

/** 그 프로필의 쓰기 6~12 첫 세션(진행 · 끝남 가림은 부르는 쪽)과 수업 · 활동 차례. 아니면 undefined. */
async function compositionOf(
  db: Db,
  profileId: string,
  sessionId: string,
): Promise<CompositionSession | undefined> {
  const [row] = await db
    .select({ session: sessions, lesson: lessons })
    .from(sessions)
    .innerJoin(lessons, eq(lessons.id, sessions.lessonId))
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.profileId, profileId),
        eq(sessions.area, "writing"),
      ),
    );
  if (
    !row ||
    row.session.unit === null ||
    row.session.writingPart === "rewrite"
  )
    return undefined;
  const lesson = LESSON_SCHEMAS.writing.parse(row.lesson.content);
  if (lesson.content.shape !== "composition") return undefined;
  const level = row.session.level ?? row.lesson.level;
  const thinkoutFrom = await getSettings(
    { "writing.thinkout_from_level": z.int().min(1) },
    { db, profileId },
  );
  return {
    session: row.session,
    lesson,
    content: lesson.content,
    level,
    unit: row.session.unit,
    activities: activitiesOf({
      area: "writing",
      level,
      content: lesson.content,
      part: "draft",
      thinkout: level >= thinkoutFrom["writing.thinkout_from_level"],
    }),
  };
}

type AttemptRow = typeof attempts.$inferSelect;

async function attemptsOf(
  db: Db,
  sessionId: string,
  activityNo?: number,
): Promise<{ row: AttemptRow; input: AttemptInput }[]> {
  const rows = await db
    .select()
    .from(attempts)
    .where(
      activityNo === undefined
        ? eq(attempts.sessionId, sessionId)
        : and(
            eq(attempts.sessionId, sessionId),
            eq(attempts.activityNo, activityNo),
          ),
    );
  return rows
    .map((row) => ({ row, input: parseAttemptInput(row.input) }))
    .filter((r): r is { row: AttemptRow; input: AttemptInput } =>
      Boolean(r.input),
    )
    .sort((a, b) => a.row.attemptedAt.getTime() - b.row.attemptedAt.getTime());
}

// ── 생각 꺼내기 ──

/** 저장된 생각 꺼내기 시도에서 결과를 다시 만든다(이름 채움). */
function thinkoutOutcomeOf(
  input: AttemptInput,
  englishName: string,
): ThinkoutOutcome | undefined {
  if (input.kind !== "thinkout") return undefined;
  if (input.step === "progress")
    return fillNameDeep(
      {
        ok: true as const,
        done: false as const,
        turn: input.turn,
        question: input.question,
        options: input.options,
      },
      englishName,
    );
  // 되살린 생각 꺼내기(restored)는 요약이 있으면 끝으로 읽는다(차례 6 검토 '차례 7 이 볼 것')
  if (input.failed || input.summary === undefined)
    return { ok: false, reason: "fallback" };
  return fillNameDeep(
    {
      ok: true as const,
      done: true as const,
      summary: input.summary,
      words: input.words ?? [],
      starters: input.starters ?? [],
    },
    englishName,
  );
}

/**
 * 생각 꺼내기 한 턴(plan-p11b 값 3 thinkoutStep). 그 세션의 진행 시도(턴 차례)로 앞 턴 기록(토리 글 = 저장한 historyEntry 글자 그대로 ·
 * 아이 답)을 만들어 thinkoutTurn — 마지막 턴(writing.thinkout_max_turns)이면 P9b 가 끝내게 한다. 끝이 아니면 진행 시도
 * { turn, answer, question, options, historyEntry }, 끝이면 끝 시도 { summary, words, starters }, 실패 · 출력 막힘 · 서버에서 던짐은
 * 끝 시도 { failed } 와 fallback, 안전 상한은 시도 없이 ai_resting.
 */
export async function thinkoutStep(
  raw: unknown,
  deps: CompositionDeps = {},
): Promise<ThinkoutOutcome> {
  const parsed = ThinkoutStepSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { sessionId, clientAttemptId, activityNo, answer } = parsed.data;
  const db: Db = deps.db ?? getDb();
  const clock = deps.now ?? deps.clock ?? appNow;
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false, reason: "not_found" };
    const name = profile.englishName;
    const [same] = await db
      .select()
      .from(attempts)
      .where(eq(attempts.clientAttemptId, clientAttemptId));
    if (same) {
      const input = parseAttemptInput(same.input);
      if (same.sessionId !== sessionId || !input)
        return { ok: false, reason: "invalid" };
      return thinkoutOutcomeOf(input, name) ?? { ok: false, reason: "invalid" };
    }
    const found = await compositionOf(db, profile.id, sessionId);
    if (
      found?.session.status !== "in_progress" ||
      found.activities[activityNo - 1]?.kind !== "thinkout"
    )
      return { ok: false, reason: "not_found" };
    const tried = (await attemptsOf(db, sessionId, activityNo)).filter(
      (r) => r.input.kind === "thinkout",
    );
    const final = tried.find((r) => r.input.step === "final");
    if (final) return thinkoutOutcomeOf(final.input, name) as ThinkoutOutcome;
    const turns = tried
      .map((r) => r.input)
      .filter(
        (
          i,
        ): i is Extract<AttemptInput, { kind: "thinkout"; step: "progress" }> =>
          i.kind === "thinkout" && i.step === "progress",
      )
      .sort((a, b) => a.turn - b.turn);
    // 첫 턴은 답 없이, 그 뒤는 앞 질문의 답과 함께
    if ((turns.length === 0) !== (answer === null))
      return { ok: false, reason: "invalid" };
    const turn = turns.length + 1;
    const history = turns.map((t, k) => ({
      assistant: t.historyEntry,
      answer: (k + 1 < turns.length ? turns[k + 1]?.answer : answer) ?? "",
    }));

    let outcome: AiOutcome<ThinkoutOutput> | { ok: false; reason: string };
    try {
      const ctx = await levelContextOf(
        {
          area: "writing",
          level: found.level,
          unit: found.unit,
          revision: found.session.seedRevision ?? found.lesson.revision,
        },
        { db },
      );
      outcome = await thinkoutTurn(
        {
          ...ctx,
          task: found.content.task,
          example: found.content.example,
          hints: [...found.content.hints],
          newWords: [...found.lesson.newWords],
          history,
          turn,
        },
        { profileId: profile.id, sessionId, level: found.level },
        deps,
      );
    } catch (error) {
      logFailure("생각 꺼내기", error);
      outcome = { ok: false, reason: SERVER_ERROR_REASON };
    }
    if (!outcome.ok && outcome.reason === "safety_cap")
      return { ok: false, reason: "ai_resting" };

    const input: AttemptInput = !outcome.ok
      ? { v: INPUT_VERSION, kind: "thinkout", step: "final", failed: true }
      : outcome.value.done
        ? {
            v: INPUT_VERSION,
            kind: "thinkout",
            step: "final",
            summary: outcome.value.summary,
            words: outcome.value.words,
            starters: outcome.value.starters,
          }
        : {
            v: INPUT_VERSION,
            kind: "thinkout",
            step: "progress",
            turn,
            answer,
            question: outcome.value.question,
            options: outcome.value.options,
            historyEntry: outcome.historyEntry ?? "",
          };
    if (!parseAttemptInput(input)) return { ok: false, reason: "invalid" };
    const inserted = await db
      .insert(attempts)
      .values({
        sessionId,
        clientAttemptId,
        activityNo,
        input,
        attemptedAt: clock(),
        status: "done",
        ...(outcome.ok
          ? {}
          : { aiFeedback: { state: "failed", reason: outcome.reason } }),
      })
      .onConflictDoNothing({ target: attempts.clientAttemptId })
      .returning({ id: attempts.id });
    if (inserted.length === 0) {
      const [first] = await db
        .select()
        .from(attempts)
        .where(eq(attempts.clientAttemptId, clientAttemptId));
      const stored = first ? parseAttemptInput(first.input) : undefined;
      const again = stored ? thinkoutOutcomeOf(stored, name) : undefined;
      if (again) return again;
    }
    return thinkoutOutcomeOf(input, name) as ThinkoutOutcome;
  } catch (error) {
    logFailure("생각 꺼내기 저장", error);
    return { ok: false, reason: "unavailable" };
  }
}

// ── 초고 제출 · 첨삭 ──

const wordsIn = (text: string) => text.trim().split(/\s+/).filter(Boolean);

/**
 * 초고 제출(plan-p11b 값 3 submitDraft). 앞 활동의 끝 시도가 다 있어야 하고(없으면 incomplete — 화면이 대기열을 비우고 다시),
 * 한 트랜잭션에 초고 끝 시도(첨삭 대기 · 실패 수 0 · 거절 수 0)와 첫 세션 끝내기(완료 · 끝낸 학습일 · 점수 비움 — 첨삭이 올 때 채움)를
 * 쓴 뒤 첨삭을 응답 뒤(after)로 넘기고 바로 결과 주소를 돌려준다. 같은 시도 id · 이미 낸 초고면 결과 주소 그대로.
 */
export async function submitDraft(
  raw: unknown,
  deps: CompositionDeps = {},
): Promise<DraftOutcome> {
  const parsed = DraftSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { sessionId, clientAttemptId, activityNo, text } = parsed.data;
  if (wordsIn(text).length === 0) return { ok: false, reason: "invalid" };
  const db: Db = deps.db ?? getDb();
  const clock = deps.now ?? deps.clock ?? appNow;
  const schedule = deps.schedule ?? ((task) => after(task));
  const resultPath = `/result/${sessionId}`;
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false, reason: "not_found" };
    const found = await compositionOf(db, profile.id, sessionId);
    if (found?.activities[activityNo - 1]?.kind !== "draft")
      return { ok: false, reason: "not_found" };
    const tried = await attemptsOf(db, sessionId);
    const submitted = tried.find(
      (r) => r.input.kind === "draft" && r.input.step === "final",
    );
    if (submitted || found.session.status === "completed")
      return submitted
        ? { ok: true, resultPath }
        : { ok: false, reason: "not_found" };
    if (found.session.status !== "in_progress")
      return { ok: false, reason: "not_found" };
    const finals = new Set(
      tried
        .filter((r) => r.input.step === "final")
        .map((r) => r.row.activityNo),
    );
    const missing = found.activities
      .map((_, i) => i + 1)
      .filter((no) => no !== activityNo && !finals.has(no));
    if (missing.length > 0) return { ok: false, reason: "incomplete", missing };
    const input: AttemptInput = {
      v: INPUT_VERSION,
      kind: "draft",
      step: "final",
      text,
    };
    if (!parseAttemptInput(input)) return { ok: false, reason: "invalid" };
    const s = await getSettings(
      {
        "app.timezone": appTimezoneSchema,
        "app.day_start_hour": appDayStartHourSchema,
      },
      { db, profileId: profile.id },
    );
    const at = clock();
    const pending: FeedbackState = {
      state: "pending",
      failures: 0,
      refusals: 0,
    };
    const attemptId = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(attempts)
        .values({
          sessionId,
          clientAttemptId,
          activityNo,
          input,
          attemptedAt: at,
          aiFeedback: pending,
          wordCount: wordsIn(text).length,
          status: "awaiting_feedback",
        })
        .onConflictDoNothing({ target: attempts.clientAttemptId })
        .returning({ id: attempts.id });
      if (!row) return undefined;
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
          englishSentences: 0,
        })
        .where(
          and(eq(sessions.id, sessionId), eq(sessions.status, "in_progress")),
        );
      return row.id;
    });
    if (attemptId)
      schedule(() => runFeedback({ attemptId }, deps).then(() => undefined));
    return { ok: true, resultPath };
  } catch (error) {
    logFailure("초고 제출", error);
    return { ok: false, reason: "unavailable" };
  }
}

const feedbackSettings = {
  "ai.feedback_max_attempts": z.int().min(1),
  "ai.timeout_seconds.feedback": z.number().positive(),
  "app.timezone": appTimezoneSchema,
  "app.day_start_hour": appDayStartHourSchema,
};

/**
 * 첨삭 한 번(plan-p11b 값 3 runFeedback · 위험 2). (1) 잡기 — 첨삭 대기이고 아무도 잡지 않았거나 잡은 지 AI 기다림 상한(타임아웃 ×
 * AI_WAIT_TIMEOUT_MULTIPLE)이 지난 때만 잡은 시각을 쓰고, 못 잡으면 부르지 않는다(다른 요청이 부르는 중). (2) writeFeedback.
 * (3) nextFeedbackState: 옴 → 시도 done · 점수(채점표 평균 ÷ 4) + 첫 세션 점수, 못 함 → 시도 feedback_failed + 부모 알림 한 번,
 * 대기 → 잡은 시각을 지우고 셈을 쓴다. 불렀으면 참.
 */
export async function runFeedback(
  { attemptId }: { attemptId: string },
  deps: CompositionDeps = {},
): Promise<boolean> {
  const db: Db = deps.db ?? getDb();
  const clock = deps.now ?? deps.clock ?? appNow;
  try {
    const [head] = await db
      .select({ session: sessions, attempt: attempts })
      .from(attempts)
      .innerJoin(sessions, eq(sessions.id, attempts.sessionId))
      .where(eq(attempts.id, attemptId));
    if (head?.attempt.status !== "awaiting_feedback") return false;
    // 쓰기 초고 끝 시도만 — 같은 상태 칸을 쓰는 회화 끝맺음 기록을 잡지 않는다(잡기 전에 본다, P13b 차례 4 검토 I-1)
    if (
      head.session.area !== "writing" ||
      parseAttemptInput(head.attempt.input)?.kind !== "draft"
    )
      return false;
    const profileId = head.session.profileId;
    const s = await getSettings(feedbackSettings, { db, profileId });
    const at = clock();
    const cutoff = new Date(
      at.getTime() -
        AI_WAIT_TIMEOUT_MULTIPLE *
          s["ai.timeout_seconds.feedback"] *
          MS_PER_SECOND,
    );
    const claimed = await db
      .update(attempts)
      .set({
        aiFeedback: sql`jsonb_set(${attempts.aiFeedback}, '{claimedAt}', to_jsonb(${at.toISOString()}::text))`,
      })
      .where(
        and(
          eq(attempts.id, attemptId),
          eq(attempts.status, "awaiting_feedback"),
          or(
            isNull(sql`${attempts.aiFeedback}->>'claimedAt'`),
            sql`(${attempts.aiFeedback}->>'claimedAt')::timestamptz < ${cutoff.toISOString()}::timestamptz`,
          ),
        ),
      )
      .returning({ input: attempts.input, aiFeedback: attempts.aiFeedback });
    const mine = claimed[0];
    if (!mine) return false;
    const before = feedbackStateOf(mine.aiFeedback);
    const input = parseAttemptInput(mine.input);
    if (before?.state !== "pending" || input?.kind !== "draft") return false;

    let outcome:
      | AiOutcome<WritingFeedbackOutput>
      | { ok: false; reason: string };
    try {
      const found = await compositionOf(db, profileId, head.session.id);
      if (!found) throw new Error("초고의 첫 세션이 없다");
      const thinkout = (await attemptsOf(db, head.session.id)).find(
        (r) => r.input.kind === "thinkout" && r.input.step === "final",
      )?.input;
      const summary =
        thinkout?.kind === "thinkout" && thinkout.step === "final"
          ? (thinkout.summary ?? null)
          : null;
      const ctx = await levelContextOf(
        {
          area: "writing",
          level: found.level,
          unit: found.unit,
          revision: found.session.seedRevision ?? found.lesson.revision,
        },
        { db },
      );
      outcome = await writeFeedback(
        {
          ...ctx,
          task: found.content.task,
          example: found.content.example,
          draft: input.text,
          thinkoutSummary: summary,
          forLevelTest: false,
        },
        { profileId, sessionId: head.session.id, level: found.level },
        deps,
      );
    } catch (error) {
      logFailure("첨삭", error);
      outcome = { ok: false, reason: SERVER_ERROR_REASON };
    }
    const next = nextFeedbackState(
      {
        state: "pending",
        failures: before.failures,
        refusals: before.refusals,
      },
      outcome,
      { maxFailures: s["ai.feedback_max_attempts"] },
    );
    await db.transaction(async (tx) => {
      if (next.state === "ready") {
        const score = rubricScore(next.value.rubric);
        await tx
          .update(attempts)
          .set({ aiFeedback: next, score, status: "done" })
          .where(eq(attempts.id, attemptId));
        await tx
          .update(sessions)
          .set({ score })
          .where(eq(sessions.id, head.session.id));
      } else if (next.state === "failed") {
        await tx
          .update(attempts)
          .set({ aiFeedback: next, status: "feedback_failed" })
          .where(eq(attempts.id, attemptId));
      } else {
        await tx
          .update(attempts)
          .set({ aiFeedback: next })
          .where(eq(attempts.id, attemptId));
      }
    });
    if (next.state === "failed") {
      await createAlertOnce(db, {
        kind: FEEDBACK_FAILED,
        profileId,
        thresholdKey: `${FEEDBACK_FAILED}:${attemptId}`,
        learningDay: learningDayOf(
          at,
          s["app.timezone"],
          s["app.day_start_hour"],
        ),
        value: { sessionId: head.session.id, reason: next.reason },
        createdAt: at,
        once: "key",
      });
    }
    return true;
  } catch (error) {
    logFailure("첨삭 저장", error);
    return false;
  }
}

/** 첨삭 상태(결과 화면이 다시 읽음 — plan-p11b 값 3 feedbackStatus). 그 프로필의 끝난 쓰기 첫 세션이 아니면 not_found. */
export async function feedbackStatus(
  raw: unknown,
  { db = getDb() }: { db?: Db } = {},
): Promise<
  | { ok: true; state: DraftFeedback["state"]; submittedAt: string }
  | { ok: false; reason: "invalid" | "not_found" | "unavailable" }
> {
  const parsed = StatusSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false, reason: "not_found" };
    const found = await draftFeedbackOf(db, {
      sessionId: parsed.data.sessionId,
      profileId: profile.id,
    });
    if (!found) return { ok: false, reason: "not_found" };
    return {
      ok: true,
      state: found.state,
      submittedAt: found.submittedAt.toISOString(),
    };
  } catch (error) {
    logFailure("첨삭 상태", error);
    return { ok: false, reason: "unavailable" };
  }
}

// ── 둘째 세션 · 밀린 첨삭(차례 7) ──

/** 앱 진입 한 번에 부를 밀린 첨삭 수(기술 값 — Vercel Hobby 300초 안에 첨삭 기다림 두 번, plan-p11b 값 3 · 위험 4). */
export const PENDING_FEEDBACK_PER_ENTRY = 2;

const RewriteSchema = z.strictObject({
  ...base,
  text: z.string().max(DRAFT_TEXT_MAX),
});

export type RewriteOutcome =
  | { ok: true; modelAnswer: string | null }
  | { ok: false; reason: "invalid" | "not_found" | "unavailable" };

/**
 * 고쳐 쓰기 제출(plan-p11b 값 3 submitRewrite · AC-4c · 위험 9). 그 프로필의 진행 중 둘째 세션 · 그 활동이 고쳐 쓰기인지 보고 끝 시도
 * { kind: "rewrite", text } 를 저장한 뒤 그 초고 첨삭의 모범 답안을 돌려준다(화면 자료에는 고쳐 쓰기 전까지 넣지 않음). 빈 모범 답안은
 * null(그 활동을 건너뜀). 같은 시도 id · 이미 낸 고쳐 쓰기면 저장한 것 그대로.
 */
export async function submitRewrite(
  raw: unknown,
  deps: CompositionDeps = {},
): Promise<RewriteOutcome> {
  const parsed = RewriteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { sessionId, clientAttemptId, activityNo, text } = parsed.data;
  if (wordsIn(text).length === 0) return { ok: false, reason: "invalid" };
  const db: Db = deps.db ?? getDb();
  const clock = deps.now ?? deps.clock ?? appNow;
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false, reason: "not_found" };
    const [row] = await db
      .select({ session: sessions, lesson: lessons })
      .from(sessions)
      .innerJoin(lessons, eq(lessons.id, sessions.lessonId))
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.profileId, profile.id),
          eq(sessions.status, "in_progress"),
          eq(sessions.writingPart, "rewrite"),
        ),
      );
    if (!row?.session.lessonId) return { ok: false, reason: "not_found" };
    const source = await rewriteSourceOf(db, {
      profileId: profile.id,
      lessonId: row.session.lessonId,
      before: row.session.startedAt,
    });
    const lesson = LESSON_SCHEMAS.writing.parse(row.lesson.content);
    if (!source || lesson.content.shape !== "composition")
      return { ok: false, reason: "not_found" };
    const activities = activitiesOf({
      area: "writing",
      level: row.session.level ?? row.lesson.level,
      content: lesson.content,
      part: "rewrite",
      corrections: source.value.corrections.length,
    });
    if (activities[activityNo - 1]?.kind !== "rewrite")
      return { ok: false, reason: "not_found" };
    const model = fillNameDeep(source.value, profile.englishName).modelAnswer;
    const outcome: RewriteOutcome = {
      ok: true,
      modelAnswer: model.trim() === "" ? null : model,
    };
    const done = (await attemptsOf(db, sessionId, activityNo)).find(
      (r) => r.input.kind === "rewrite" && r.input.step === "final",
    );
    if (done) return outcome;
    const input: AttemptInput = {
      v: INPUT_VERSION,
      kind: "rewrite",
      step: "final",
      text,
    };
    if (!parseAttemptInput(input)) return { ok: false, reason: "invalid" };
    await db
      .insert(attempts)
      .values({
        sessionId,
        clientAttemptId,
        activityNo,
        input,
        attemptedAt: clock(),
        wordCount: wordsIn(text).length,
        status: "done",
      })
      .onConflictDoNothing({ target: attempts.clientAttemptId });
    return outcome;
  } catch (error) {
    logFailure("고쳐 쓰기 저장", error);
    return { ok: false, reason: "unavailable" };
  }
}

/** 그 첫 세션의 대기 초고 첨삭을 한 번 부른다(둘째 세션을 열 때 — 값 9). 불렀으면 참. */
export async function runDraftFeedback(
  { draftSessionId }: { draftSessionId: string },
  deps: CompositionDeps = {},
): Promise<boolean> {
  const db: Db = deps.db ?? getDb();
  const [pending] = await db
    .select({ id: attempts.id })
    .from(attempts)
    .where(
      and(
        eq(attempts.sessionId, draftSessionId),
        eq(attempts.status, "awaiting_feedback"),
      ),
    );
  return pending ? runFeedback({ attemptId: pending.id }, deps) : false;
}

/**
 * 밀린 첨삭(10절 운영 '첨삭 재시도는 앱 진입 때' · plan-p11b 값 3 retryPendingFeedback): 그 프로필의 첨삭 대기 초고를 오래된 차례로
 * 많아야 PENDING_FEEDBACK_PER_ENTRY 개 부른다(잡기가 겹침을 막는다). 부른 수를 돌려준다. 1-나는 'AI 쉬는 중'이면 부르지 않게 앞에서 본다.
 */
export async function retryPendingFeedback(
  { profileId }: { profileId: string },
  deps: CompositionDeps = {},
): Promise<number> {
  const db: Db = deps.db ?? getDb();
  try {
    const waiting = await db
      .select({ id: attempts.id, at: attempts.attemptedAt })
      .from(attempts)
      .innerJoin(sessions, eq(sessions.id, attempts.sessionId))
      .where(
        and(
          eq(sessions.profileId, profileId),
          // 쓰기 초고만(회화 끝맺음 기록도 awaiting_feedback 이다 — P13b 차례 4 검토 I-1)
          eq(sessions.area, "writing"),
          eq(attempts.status, "awaiting_feedback"),
          sql`${attempts.input}->>'kind' = 'draft'`,
        ),
      );
    const oldest = waiting
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .slice(0, PENDING_FEEDBACK_PER_ENTRY);
    let called = 0;
    for (const { id } of oldest)
      if (await runFeedback({ attemptId: id }, deps)) called += 1;
    return called;
  } catch (error) {
    logFailure("밀린 첨삭", error);
    return 0;
  }
}

/**
 * 수업 시작(서버 액션 startLesson 이 부름 — plan-p11b 값 9): 시작 판정이 첨삭 대기(feedback_pending)면 그 첨삭을 한 번 기다린 뒤(그동안
 * 화면은 기다림 표시) 다시 판정한다. 그래도 대기면 feedback_pending — 화면이 '아직 글을 살펴보고 있어요'.
 */
export async function startLessonAfterFeedback(
  raw: unknown,
  deps: CompositionDeps & { now: () => Date },
): Promise<StartOutcome> {
  const sessionDeps = {
    now: deps.now,
    ...(deps.db ? { db: deps.db } : {}),
  };
  const first = await startLessonSession(raw, sessionDeps);
  if (first.ok || first.reason !== "feedback_pending" || !first.draftSessionId)
    return first;
  await runDraftFeedback({ draftSessionId: first.draftSessionId }, deps);
  return startLessonSession(raw, sessionDeps);
}

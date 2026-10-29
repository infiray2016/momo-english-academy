import "server-only";
import {
  and,
  asc,
  eq,
  gte,
  isNull,
  like,
  ne,
  notExists,
  or,
  sql,
} from "drizzle-orm";
// 회화 끝맺음 턴 · 홈 진입 정리 · 보낸 메시지 지우기(plan-p13b 파일별 값 3 · 정할 것 회18, 8절 '끝맺음 없이 떠난 대화' · '대화 안전 상한' ·
// '같은 프로필의 동시 사용', 5절 talk_turns · attempts 끝맺음 기록 · talk_summaries, 6.4 · AC-8c · AC-15f · AC-16b · AC-16c).
// 끝맺음 기록은 attempts 한 행(activity_no 0 · 시도 id `talk-closing:<세션 id>`)이고 유일 색인이 잡기를 겸한다. 상태는 ai_feedback 칸
// (대기 → 옴 · 못 함, 끝맺음 없이 닫으면 건너뜀). 끝맺음이 끝나거나(옴 · 못 함) 끝맺음 없이 닫히면 그 세션 talk_turns 의 보낸 사용자 메시지
// 전문 · 다시 쓸 토리 차례를 지운다(B5-21 — 끝맺음이 그 대화를 써야 하므로 그 뒤). 아이 글 · AI 글을 로그에 내지 않는다.
import { after } from "next/server";
import { z } from "zod";
import {
  parseTalkAttemptInput,
  TALK_CLOSING_ACTIVITY_NO,
  type TalkAttemptInput,
  type TalkClosingReason,
  talkClosingAttemptId,
} from "@/core/conversation/attempt";
import { farewellOf } from "@/core/conversation/wrap-up";
import { learningDayOf } from "@/core/learning-day";
import { AI_WAIT_TIMEOUT_MULTIPLE } from "@/core/seed/structure";
import {
  attempts,
  sessions,
  talkSummaries,
  talkTurns,
} from "@/db/schema/learning";
import { talkClosing } from "@/server/ai";
import { maskerFor } from "@/server/ai/run";
import { now as appNow } from "@/server/clock";
import { type Db, type DbOrTx, getDb } from "@/server/db";
import { dbErrorTag } from "@/server/db/safe-error";
import { readHouseholdProfile } from "@/server/profile";
import { getOutputCheckLists } from "@/server/seed-lists";
import { levelContextOf } from "@/server/session/ai-context";
import { aiRestingToday } from "@/server/session/ai-gate";
import {
  appDayStartHourSchema,
  appTimezoneSchema,
  getSettings,
} from "@/server/settings";
import {
  onTalkSessionEnded,
  positiveInt,
  readTalkState,
  type TalkServerDeps,
  talkInputOf,
} from "./state";

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
/** 8절 '두 번 실패하면 요약 없이 닫는다'의 고정 수(설계 구조 수 — 12절 키가 아니다). */
export const CLOSING_FAILURES_TO_GIVE_UP = 2;
/** 홈 진입 한 번에 부를 끝맺음 수(기술 값 — Vercel Hobby 300초 안, plan-p13b 값 3). */
export const IDLE_CLOSINGS_PER_ENTRY = 2;
/** 끝맺음 기록 시도 id 머리(유일 색인 · 찾기). */
const CLOSING_ID_PREFIX = "talk-closing:";
/** 안전 상한 셈을 찾는 기간(기술 값 — 학습일 하나를 덮는 이틀, 학습일은 JS 로 다시 가른다). */
const SAFETY_LOOKBACK_MS = 2 * 24 * 60 * MS_PER_MINUTE;

/** 끝맺음 결과(마무리 둘째 장 · 정리 끝인사가 쓰는 칸). */
const ClosingValueSchema = z.strictObject({
  farewell: z.string(),
  farewellKo: z.string(),
  goodLines: z.array(z.string()),
  nextTime: z.array(z.string()),
});
export type ClosingValue = z.infer<typeof ClosingValueSchema>;

const Count = z.int().min(0);
const ClosingStateSchema = z.discriminatedUnion("state", [
  z.strictObject({
    state: z.literal("pending"),
    failures: Count,
    /** 지금 부르는 요청이 잡은 시각(ISO). */
    claimedAt: z.string().optional(),
  }),
  z.strictObject({ state: z.literal("ready"), value: ClosingValueSchema }),
  z.strictObject({ state: z.literal("failed"), failures: Count }),
  /** 끝맺음 없이 닫음(1-가 안전 상한 날 목표 턴 전 '그만하기' · 다른 수업 고르기 · 이어 하기 시간 지남 — 이음매 · 지우기 끝). */
  z.strictObject({ state: z.literal("skipped") }),
]);
export type ClosingState = z.infer<typeof ClosingStateSchema>;

export function closingStateOf(raw: unknown): ClosingState | undefined {
  const parsed = ClosingStateSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

/** 끝맺음 기록의 닫힌 까닭(a 시도 꼴 talk-closing 갈래). */
export type ClosingReason = TalkClosingReason;

/** 다음 상태(값 3): 옴 · 실패 수 + 1(CLOSING_FAILURES_TO_GIVE_UP 이면 못 함). 하루 안전 상한은 셈에 넣지 않는다. */
export function nextClosingState(
  before: { failures: number },
  outcome: { ok: true; value: ClosingValue } | { ok: false; reason: string },
): ClosingState {
  if (outcome.ok) return { state: "ready", value: outcome.value };
  if (outcome.reason === "safety_cap")
    return { state: "pending", failures: before.failures };
  const failures = before.failures + 1;
  return failures >= CLOSING_FAILURES_TO_GIVE_UP
    ? { state: "failed", failures }
    : { state: "pending", failures };
}

function logFailure(what: string, error: unknown) {
  console.error(`${what} 실패(${dbErrorTag(error)})`);
}

/**
 * 끝맺음 기록을 넣는다(없을 때만 — 유일 색인). pending 이면 끝맺음 대기, skipped 면 끝맺음 없이 닫힘. 넣었으면 참.
 */
export async function insertClosingRecord(
  tx: DbOrTx,
  {
    sessionId,
    at,
    reason,
    skipped = false,
  }: { sessionId: string; at: Date; reason: ClosingReason; skipped?: boolean },
): Promise<boolean> {
  const state: ClosingState = skipped
    ? { state: "skipped" }
    : { state: "pending", failures: 0 };
  const rows = await tx
    .insert(attempts)
    .values({
      sessionId,
      clientAttemptId: talkClosingAttemptId(sessionId),
      activityNo: TALK_CLOSING_ACTIVITY_NO,
      input: {
        v: 1,
        kind: "talk-closing",
        step: "final",
        reason,
      } satisfies TalkAttemptInput,
      attemptedAt: at,
      aiFeedback: state,
      status: skipped ? "done" : "awaiting_feedback",
    })
    .onConflictDoNothing({ target: attempts.clientAttemptId })
    .returning({ id: attempts.id });
  return rows.length > 0;
}

/** 그 세션 talk_turns 의 보낸 사용자 메시지 전문 · 다시 쓸 토리 차례를 지운다(B5-21 · AC-16c). */
export async function clearSentMessages(
  tx: DbOrTx,
  sessionId: string,
): Promise<void> {
  await tx
    .update(talkTurns)
    .set({ sentUserMessage: null, toriRewrite: null })
    .where(eq(talkTurns.sessionId, sessionId));
}

/**
 * 끝맺음 없이 닫는다(1-가 안전 상한 날 목표 턴 전 '그만하기' · 홈 진입 정리 (다)): 건너뜀 기록 · 보낸 메시지 지움. 기록이 이미
 * 있으면(다른 요청이 닫음) 아무것도 하지 않는다.
 */
export async function closeWithoutClosing(
  tx: DbOrTx,
  {
    sessionId,
    at,
    reason,
  }: { sessionId: string; at: Date; reason: ClosingReason },
): Promise<boolean> {
  const inserted = await insertClosingRecord(tx, {
    sessionId,
    at,
    reason,
    skipped: true,
  });
  if (inserted) await clearSentMessages(tx, sessionId);
  return inserted;
}

/** 그 학습일에 대화 안전 상한으로 닫힌 이 프로필의 회화 수(이번 것 포함 — 끝맺음 기록의 까닭으로 센다). */
export async function safetyClosesOn(
  db: DbOrTx,
  {
    profileId,
    at,
    learningDay,
    timezone,
    dayStartHour,
  }: {
    profileId: string;
    at: Date;
    learningDay: string;
    timezone: string;
    dayStartHour: number;
  },
): Promise<number> {
  const rows = await db
    .select({ input: attempts.input, attemptedAt: attempts.attemptedAt })
    .from(attempts)
    .innerJoin(sessions, eq(sessions.id, attempts.sessionId))
    .where(
      and(
        eq(sessions.profileId, profileId),
        eq(sessions.area, "talk"),
        like(attempts.clientAttemptId, `${CLOSING_ID_PREFIX}%`),
        gte(attempts.attemptedAt, new Date(at.getTime() - SAFETY_LOOKBACK_MS)),
      ),
    );
  return rows.filter((r) => {
    const input = parseTalkAttemptInput(r.input);
    return (
      input?.kind === "talk-closing" &&
      input.reason === "safety" &&
      learningDayOf(r.attemptedAt, timezone, dayStartHour) === learningDay
    );
  }).length;
}

const closingSettings = {
  "ai.timeout_seconds.feedback": z.number().positive(),
  "talk.memory_summaries": z.unknown(),
  "talk.summary_max_chars": z.unknown(),
  "app.timezone": appTimezoneSchema,
  "app.day_start_hour": appDayStartHourSchema,
} as Record<string, z.ZodType>;

/** 응답 뒤(after)에 끝맺음 한 번. 시험은 schedule 로 바로 돌린다. */
export function scheduleTalkClosing(
  sessionId: string,
  deps: TalkServerDeps,
): void {
  const schedule = deps.schedule ?? ((task) => after(task));
  schedule(async () => {
    await runTalkClosing(sessionId, deps);
  });
}

/**
 * 끝맺음 한 번(값 3). (1) 잡기 — 대기이고 아무도 잡지 않았거나 잡은 지 AI 기다림 상한(ai.timeout_seconds.feedback ×
 * AI_WAIT_TIMEOUT_MULTIPLE)이 지난 때만 잡은 시각을 쓰고(SQL 안 now() 대신 매개변수), 못 잡으면 부르지 않는다. 1-가 하루 안전 상한이면
 * 잡지 않는다(미룸 — 풀린 학습일의 홈 진입). (2) 같은 대화 · 끝맺음 칸으로 talkClosing. (3) 옴 → 요약을 talk_summaries 에(검사를 지났을 때만,
 * 가림 · {NAME} · talk.summary_max_chars), 실패 → 실패 수 + 1(두 번이면 못 함). 옴 · 못 함이면 보낸 메시지를 지운다. 불렀으면 참.
 */
export async function runTalkClosing(
  sessionId: string,
  deps: TalkServerDeps,
): Promise<boolean> {
  const db: Db = deps.db ?? getDb();
  const clock = deps.now ?? appNow;
  try {
    const [head] = await db
      .select({ session: sessions, attempt: attempts })
      .from(attempts)
      .innerJoin(sessions, eq(sessions.id, attempts.sessionId))
      .where(eq(attempts.clientAttemptId, talkClosingAttemptId(sessionId)));
    if (head?.attempt.status !== "awaiting_feedback") return false;
    const profileId = head.session.profileId;
    const at = clock();
    if (await aiRestingToday({ profileId, at }, { db })) return false;
    const s = await getSettings(closingSettings, { db, profileId });
    const cutoff = new Date(
      at.getTime() -
        AI_WAIT_TIMEOUT_MULTIPLE *
          (s["ai.timeout_seconds.feedback"] as number) *
          MS_PER_SECOND,
    );
    const claimed = await db
      .update(attempts)
      .set({
        aiFeedback: sql`jsonb_set(${attempts.aiFeedback}, '{claimedAt}', to_jsonb(${at.toISOString()}::text))`,
      })
      .where(
        and(
          eq(attempts.id, head.attempt.id),
          eq(attempts.status, "awaiting_feedback"),
          or(
            isNull(sql`${attempts.aiFeedback}->>'claimedAt'`),
            sql`(${attempts.aiFeedback}->>'claimedAt')::timestamptz < ${cutoff.toISOString()}::timestamptz`,
          ),
        ),
      )
      .returning({ aiFeedback: attempts.aiFeedback });
    const before = closingStateOf(claimed[0]?.aiFeedback);
    if (before?.state !== "pending") return false;

    let outcome:
      | { ok: true; value: ClosingValue; summary: string | null }
      | { ok: false; reason: string };
    let state: Awaited<ReturnType<typeof readTalkState>>;
    try {
      state = await readTalkState(db, { sessionId, profileId, at });
      if (!state) throw new Error("끝맺음할 회화 세션이 없다");
      const ctx = await levelContextOf(
        {
          area: "talk",
          level: state.level,
          unit: state.unit,
          revision: state.session.seedRevision ?? state.lessonRow.revision,
        },
        { db },
      );
      const lastChild = state.liveRows.findLast((r) => r.speaker === "child");
      const input = await talkInputOf(db, {
        state,
        ctx,
        rowsBefore: state.liveRows,
        turn: {
          child: "",
          input: "speech",
          segment: lastChild?.segment === "more_talk" ? "more_talk" : "talk",
          hintKind: "none",
          hintTier: 0,
          heardHelp: "none",
          dontKnowCount: 0,
          targetReached: state.position.targetReached,
          closing: true,
          levelTest: false,
          moreTalkUsedUp: state.position.moreTalkUsedUp,
          aiQuestionSlot: false,
        },
        summaryLimit: positiveInt(s, "talk.memory_summaries"),
      });
      const result = await talkClosing(
        input,
        {
          profileId,
          sessionId,
          level: state.level,
          requestReceivedAt: at,
        },
        { db, clock, ...deps.ai },
      );
      if (result.ok) {
        const v = result.value;
        outcome = {
          ok: true,
          value: {
            farewell: v.farewell,
            farewellKo: v.farewell_ko,
            goodLines: v.good_lines,
            nextTime: v.next_time_lines,
          },
          summary:
            result.summaryBlocked || v.summary.trim() === "" ? null : v.summary,
        };
      } else outcome = { ok: false, reason: result.reason };
    } catch (error) {
      logFailure("끝맺음", error);
      outcome = { ok: false, reason: "server" };
    }

    const next = nextClosingState(before, outcome);
    const learningDay = learningDayOf(
      at,
      s["app.timezone"] as string,
      s["app.day_start_hour"] as number,
    );
    let summary: string | null = null;
    if (outcome.ok && outcome.summary !== null) {
      const contact = getOutputCheckLists()
        .forbidden.patterns.filter((p) => p.category === "contact")
        .map((p) => p.regex);
      const masker = await maskerFor(db, profileId, contact);
      summary = Array.from(masker(outcome.summary).text)
        .slice(0, positiveInt(s, "talk.summary_max_chars"))
        .join("");
    }
    await db.transaction(async (tx) => {
      await tx
        .update(attempts)
        .set({
          aiFeedback: next,
          status:
            next.state === "ready"
              ? "done"
              : next.state === "failed"
                ? "feedback_failed"
                : "awaiting_feedback",
        })
        .where(eq(attempts.id, head.attempt.id));
      if (next.state === "ready" && summary !== null && summary !== "")
        await tx.insert(talkSummaries).values({
          profileId,
          sessionId,
          learningDay,
          summary,
          recordedAt: at,
        });
      if (next.state !== "pending") await clearSentMessages(tx, sessionId);
    });
    return true;
  } catch (error) {
    logFailure("끝맺음", error);
    return false;
  }
}

export type ClosingStatus =
  | { state: "pending" | "failed" | "none" }
  | {
      state: "ready";
      farewell: { en: string; ko?: string };
      goodLines: string[];
      nextTime: string[];
    };

const StatusInputSchema = z.strictObject({ sessionId: z.uuid() });

/**
 * 끝맺음 상태(마무리 둘째 장 · 정리 끝인사 — 화면이 CLOSING_POLL_MS 마다, c). 옴이면 끝인사(검사를 지난 끝맺음 끝인사, 비었으면 카드
 * 끝인사 — a farewellOf) · 잘한 말 · 다음엔 이렇게. 남의 세션 · 기록 없음은 none.
 */
export async function talkClosingStatus(
  raw: unknown,
  deps: Pick<TalkServerDeps, "db" | "now">,
): Promise<ClosingStatus> {
  const parsed = StatusInputSchema.safeParse(raw);
  if (!parsed.success) return { state: "none" };
  const db = deps.db ?? getDb();
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { state: "none" };
    const state = await readTalkState(db, {
      sessionId: parsed.data.sessionId,
      profileId: profile.id,
      at: deps.now(),
    });
    if (!state) return { state: "none" };
    const [row] = await db
      .select({ aiFeedback: attempts.aiFeedback })
      .from(attempts)
      .where(
        eq(
          attempts.clientAttemptId,
          talkClosingAttemptId(parsed.data.sessionId),
        ),
      );
    const closing = closingStateOf(row?.aiFeedback);
    if (!closing || closing.state === "skipped") return { state: "none" };
    if (closing.state !== "ready") return { state: closing.state };
    const farewell = farewellOf({
      closing: {
        farewell: closing.value.farewell,
        farewellKo: closing.value.farewellKo,
      },
      card: state.card,
      koMeaning: state.spec.koMeaning,
    });
    return {
      state: "ready",
      farewell: {
        en: farewell.en,
        ...(farewell.ko === undefined ? {} : { ko: farewell.ko }),
      },
      goodLines: closing.value.goodLines,
      nextTime: closing.value.nextTime,
    };
  } catch (error) {
    logFailure("끝맺음 상태", error);
    return { state: "none" };
  }
}

const idleSettings = {
  "talk.idle_close_minutes": z.number().positive(),
};

/**
 * 홈 진입 정리(홈 쪽 after() — 10절 · 8절 '끝맺음 없이 떠난 대화' · 값 3). (가) 완료 · 대화 안 닫힘 · 마지막 턴이
 * talk.idle_close_minutes 보다 오래된 회화 → 정리로 닫고 끝맺음 대기(마무리는 안 보임) — 그 전이면 다른 기기가 쓰는 중으로 보고 닫지 않는다
 * (8절 '같은 프로필의 동시 사용' · AC-15f). (나) 끝맺음 대기 · 실패 < 2 · 잡기 낡음 → 다시. (다) 중단된 회화(그만하기 · 다른 수업 ·
 * 시간 지남)로 끝맺음 기록이 없는 것 → 이음매 · 보낸 메시지 지움 · 건너뜀 기록. 1-가 하루 안전 상한이면 끝맺음은 부르지 않고 정리만.
 * 한 진입에 끝맺음 많아야 IDLE_CLOSINGS_PER_ENTRY. 부른 끝맺음 수를 돌려준다.
 */
export async function closeIdleTalks(
  { profileId, at }: { profileId: string; at: Date },
  deps: TalkServerDeps,
): Promise<number> {
  const db: Db = deps.db ?? getDb();
  try {
    const s = await getSettings(idleSettings, { db, profileId });
    const cutoff = new Date(
      at.getTime() - s["talk.idle_close_minutes"] * MS_PER_MINUTE,
    );
    const talkOf = and(
      eq(sessions.profileId, profileId),
      eq(sessions.area, "talk"),
    );
    const closingOf = (sessionId: typeof sessions.id) =>
      db
        .select({ id: attempts.id })
        .from(attempts)
        .where(
          and(
            eq(attempts.sessionId, sessionId),
            like(attempts.clientAttemptId, `${CLOSING_ID_PREFIX}%`),
          ),
        );

    // (가) 목표 턴 뒤 앱을 닫은 대화 — 대화가 열려 있고 마지막 턴이 talk.idle_close_minutes 보다 오래됨(SQL 에서 거름, 검토 M-5)
    const idle = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(
        and(
          talkOf,
          eq(sessions.status, "completed"),
          or(isNull(sessions.talkSegment), ne(sessions.talkSegment, "wrap_up")),
          notExists(
            db
              .select({ id: talkTurns.id })
              .from(talkTurns)
              .where(
                and(
                  eq(talkTurns.sessionId, sessions.id),
                  gte(talkTurns.recordedAt, cutoff),
                ),
              ),
          ),
        ),
      );
    for (const talk of idle) {
      await db.transaction(async (tx) => {
        const [locked] = await tx
          .select({ talkSegment: sessions.talkSegment })
          .from(sessions)
          .where(eq(sessions.id, talk.id))
          .for("update");
        if (!locked || locked.talkSegment === "wrap_up") return;
        await tx
          .update(sessions)
          .set({ talkSegment: "wrap_up" })
          .where(eq(sessions.id, talk.id));
        await insertClosingRecord(tx, {
          sessionId: talk.id,
          at,
          reason: "idle",
        });
      });
    }

    // (다) 끝맺음 기록 없이 중단으로 닫힌 회화(다른 수업 고르기 · 시간 지남)
    const aborted = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(
        and(
          talkOf,
          eq(sessions.status, "aborted"),
          notExists(closingOf(sessions.id)),
        ),
      );
    for (const talk of aborted) {
      await db.transaction(async (tx) => {
        const inserted = await closeWithoutClosing(tx, {
          sessionId: talk.id,
          at,
          reason: "aborted",
        });
        if (inserted)
          await onTalkSessionEnded(tx, {
            sessionId: talk.id,
            profileId,
            ended: "aborted",
          });
      });
    }

    // (나) 끝맺음 대기(미룬 것 · 실패 하나 · 잡기 낡음) — 오래된 차례로
    if (await aiRestingToday({ profileId, at }, { db })) return 0;
    const waiting = await db
      .select({
        sessionId: attempts.sessionId,
        aiFeedback: attempts.aiFeedback,
      })
      .from(attempts)
      .innerJoin(sessions, eq(sessions.id, attempts.sessionId))
      .where(
        and(
          talkOf,
          eq(attempts.status, "awaiting_feedback"),
          like(attempts.clientAttemptId, `${CLOSING_ID_PREFIX}%`),
        ),
      )
      .orderBy(asc(attempts.attemptedAt));
    let called = 0;
    for (const record of waiting) {
      if (called >= IDLE_CLOSINGS_PER_ENTRY) break;
      if (closingStateOf(record.aiFeedback)?.state !== "pending") continue;
      if (await runTalkClosing(record.sessionId, { ...deps, db })) called += 1;
    }
    return called;
  } catch (error) {
    logFailure("회화 홈 진입 정리", error);
    return 0;
  }
}

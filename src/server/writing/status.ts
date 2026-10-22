import "server-only";
// 쓰기 6~12 첫 세션의 첨삭 상태 읽기(plan-p11b 파일별 값 3 feedbackStatus · 값 10 결과 화면). AI 층(@/server/ai)을 가져오지 않는다 —
// 결과 화면 · 세션 화면 자료가 이 모듈만 읽어 첨삭 호출 길과 떨어지게(세션 쪽은 AI 를 부르지 않음, AC-1b).
import { and, eq } from "drizzle-orm";
import { parseAttemptInput } from "@/core/session/attempt";
import { type FeedbackValue, feedbackStateOf } from "@/core/writing/feedback";
import { attempts, sessions } from "@/db/schema/learning";
import type { DbOrTx } from "@/server/db";

export type DraftFeedback = {
  /** 대기(첨삭 기다림) · 옴 · 못 함. 상태 글이 꼴이 아니면 대기로 본다(화면은 기다림 표시 — 밀린 첨삭이 다시 부름). */
  state: "pending" | "ready" | "failed";
  /** 초고를 낸 시각(결과 화면이 ai.timeout_seconds.feedback 을 더해 '수업 목록'으로 바꿈). */
  submittedAt: Date;
};

/** 그 프로필의 끝난 쓰기 첫 세션(writing_part draft)의 초고 첨삭 상태. 그런 세션 · 초고 끝 시도가 없으면 undefined. */
export async function draftFeedbackOf(
  db: DbOrTx,
  { sessionId, profileId }: { sessionId: string; profileId: string },
): Promise<DraftFeedback | undefined> {
  const [session] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.profileId, profileId),
        eq(sessions.status, "completed"),
        eq(sessions.writingPart, "draft"),
      ),
    );
  if (!session) return undefined;
  const rows = await db
    .select({
      input: attempts.input,
      aiFeedback: attempts.aiFeedback,
      attemptedAt: attempts.attemptedAt,
    })
    .from(attempts)
    .where(eq(attempts.sessionId, sessionId));
  const draft = rows.find((r) => {
    const input = parseAttemptInput(r.input);
    return input?.kind === "draft" && input.step === "final";
  });
  if (!draft) return undefined;
  const state = feedbackStateOf(draft.aiFeedback)?.state ?? "pending";
  return { state, submittedAt: draft.attemptedAt };
}

export type RewriteSource = {
  draftSessionId: string;
  /** 첨삭 값(가린 글 그대로 — 화면에 낼 때 이름을 채운다). */
  value: FeedbackValue;
  /** 낸 초고 글(고쳐 쓰기 입력란에 채워 둠). */
  draftText: string;
};

/**
 * 둘째 세션(고쳐 쓰기)이 기대는 첫 세션 · 첨삭(plan-p11b 값 9 · 11): 같은 프로필 · 같은 수업 행의 끝난 첫 세션 가운데 둘째 세션 시작
 * 전에 끝났고 첨삭이 온 가장 늦은 것. 없으면 undefined.
 */
export async function rewriteSourceOf(
  db: DbOrTx,
  {
    profileId,
    lessonId,
    before,
  }: { profileId: string; lessonId: string; before: Date },
): Promise<RewriteSource | undefined> {
  const firsts = await db
    .select({ id: sessions.id, completedAt: sessions.completedAt })
    .from(sessions)
    .where(
      and(
        eq(sessions.profileId, profileId),
        eq(sessions.lessonId, lessonId),
        eq(sessions.status, "completed"),
        eq(sessions.writingPart, "draft"),
      ),
    );
  const ordered = firsts
    .filter((f) => f.completedAt !== null && f.completedAt <= before)
    .sort(
      (a, b) =>
        (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0),
    );
  for (const first of ordered) {
    const rows = await db
      .select({ input: attempts.input, aiFeedback: attempts.aiFeedback })
      .from(attempts)
      .where(eq(attempts.sessionId, first.id));
    for (const row of rows) {
      const input = parseAttemptInput(row.input);
      const state = feedbackStateOf(row.aiFeedback);
      if (
        input?.kind === "draft" &&
        input.step === "final" &&
        state?.state === "ready"
      )
        return {
          draftSessionId: first.id,
          value: state.value,
          draftText: input.text,
        };
    }
  }
  return undefined;
}

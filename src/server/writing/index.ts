import "server-only";
// 쓰기 AI 서버 함수(3.3 쓰기 4~5 · 6.2 쓰기 확인 · 3.7 쓰기 4~5 행 · 8절 'AI 호출 하나의 실패', plan-p11b 파일별 값 3 · 'AI 실패 갈래별
// 화면 길' 쓰기 확인 행 · 정할 것 ㄴ · ㄷ, 13절 C50 (2) · C80). 쓰기 4~5 확인(checkGuided)은 여기, 6~12 생각 꺼내기 · 초고 · 첨삭
// (차례 6)은 composition.ts 에서 다시 내보낸다. 고쳐 쓰기 · 밀린 첨삭은 차례 7 이 더한다. AI 는 P9c 공개 함수(@/server/ai)로만 부르고 그 자리에서 시도를 저장한다.
// 같은 시도 id(또는 같은 활동의 끝 시도)가 있으면 저장한 결과를 그대로 돌려준다(AI 를 두 번 부르지 않음). 아이 글 · AI 글은
// 로그 · 오류 · 알림 값에 넣지 않는다(오류는 이름 · 코드만, safe-error). 시각은 deps 에서 읽는다.
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { WritingCheckOutput } from "@/core/ai/calls/writing";
import { fillNameDeep } from "@/core/ai/mask";
import { cleanSentenceRate } from "@/core/scoring/score";
import { LESSON_SCHEMAS } from "@/core/seed/schema/lesson";
import { INPUT_VERSION, parseAttemptInput } from "@/core/session/attempt";
import { activitiesOf } from "@/core/session/preview";
import { fixSpotOf } from "@/core/writing/guided";
import { lessons } from "@/db/schema/content";
import { attempts, sessions } from "@/db/schema/learning";
import { type AiDeps, type AiOutcome, checkWriting } from "@/server/ai";
import { now as appNow } from "@/server/clock";
import { type Db, getDb } from "@/server/db";
import { dbErrorTag } from "@/server/db/safe-error";
import { readHouseholdProfile } from "@/server/profile";
import { levelContextOf } from "@/server/session/ai-context";

export {
  type CompositionDeps,
  type DraftOutcome,
  feedbackStatus,
  runFeedback,
  submitDraft,
  type ThinkoutOutcome,
  thinkoutStep,
} from "@/server/writing/composition";

/** 활동 번호 상한(세션 서버의 시도 겉꼴과 같은 기술 값). */
const ACTIVITY_NO_MAX = 200;
/** AI 를 부르다 서버에서 던진 때의 실패 까닭(호출부 결함 · 가변부 재료 없음 — 8절 표의 '서버 오류' 갈래). */
const SERVER_ERROR_REASON = "error";

export type WritingDeps = AiDeps & {
  /** 시도 저장 시각(없으면 deps.clock, 그것도 없으면 앱 시계). */
  now?: () => Date;
};

const GuidedInputSchema = z.strictObject({
  sessionId: z.uuid(),
  clientAttemptId: z.uuid(),
  activityNo: z.int().min(1).max(ACTIVITY_NO_MAX),
  sentences: z.array(z.string()).min(1),
});

/** 고칠 곳 하나(3.3 '고칠 곳을 누르면 보기 2~3개가 나오고 아이가 골라 고친다'). 이유는 바르게 고친 뒤에만 보인다(13절 C86), 모범 답안은 없다(3.3 4단계 행). */
export type GuidedFix = {
  sentenceIndex: number;
  /** 아이 문장에서 색칠할 자리(아이가 쓴 그대로). */
  original: string;
  /** 바른 표현 + 헷갈리는 보기, 시도 id 로 정한 차례로 섞음. */
  options: string[];
  /** 바른 표현. */
  correct: string;
  /** 한 문장 이유(해요체 — 바르게 고친 뒤에만 보인다, 13절 C86). */
  reason: string;
};

export type GuidedCheckOutcome =
  | { ok: true; praise: string; fix?: GuidedFix }
  | {
      ok: false;
      reason:
        | "skipped" // 확인 없이 넘어감(8절 — 점수 없는 세션)
        | "ai_resting" // 1-가 하루 안전 상한(시도를 남기지 않음 — 세션은 진행, C50 (2))
        | "invalid"
        | "not_found" // 그 프로필의 진행 중 쓰기 세션 · 그 활동이 아님
        | "unavailable"; // 저장을 못 함(DB) — 화면이 같은 시도 id 로 다시 부른다
    };

/** attempts.ai_feedback 에 두는 쓰기 확인 결과(JSON null 없음). */
type CheckFeedback =
  | { state: "ok"; value: WritingCheckOutput }
  | { state: "failed"; reason: string };

/** 시도 id 로 정한 차례(같은 id 면 같은 차례 — 다시 불러도 보기 차례가 그대로). */
function rotationOf(seed: string, size: number): number {
  let sum = 0;
  for (const ch of seed) sum = (sum + (ch.codePointAt(0) ?? 0)) % size;
  return sum;
}

/**
 * 아이에게 돌려줄 결과. AI 글의 {NAME} 을 프로필 영어 이름으로 채운 뒤(6.1 — 저장한 ai_feedback 은 가린 글 그대로) 아이 문장에서
 * 고칠 곳 자리를 찾는다(아이 문장에는 실제 이름이 있어 채우기 전 글로는 못 찾는다, 검토 review-p11-5-code I-1).
 */
function outcomeOf(
  feedback: CheckFeedback,
  clientAttemptId: string,
  sentences: readonly string[],
  englishName: string,
): GuidedCheckOutcome {
  if (feedback.state !== "ok") return { ok: false, reason: "skipped" };
  const { praise, fixes } = fillNameDeep(feedback.value, englishName);
  const found = fixes.find(
    (f) =>
      sentences[f.sentenceIndex] !== undefined &&
      fixSpotOf(sentences[f.sentenceIndex] as string, f.original) >= 0,
  );
  if (!found) return { ok: true, praise };
  const choices = [
    found.corrected,
    ...found.distractors.filter((d) => d !== found.corrected),
  ].filter((d, i, all) => all.indexOf(d) === i);
  const turn = rotationOf(clientAttemptId, choices.length);
  return {
    ok: true,
    praise,
    fix: {
      sentenceIndex: found.sentenceIndex,
      original: found.original,
      options: [...choices.slice(turn), ...choices.slice(0, turn)],
      correct: found.corrected,
      reason: found.reason,
    },
  };
}

const wordsIn = (text: string) => text.trim().split(/\s+/).filter(Boolean);

type StoredRow = {
  clientAttemptId: string;
  activityNo: number;
  input: unknown;
  aiFeedback: unknown;
};

/** 저장된 쓰기 확인 끝 시도에서 결과를 다시 만든다(꼴이 아니면 undefined). */
function storedOutcome(
  row: StoredRow,
  englishName: string,
): GuidedCheckOutcome | undefined {
  const input = parseAttemptInput(row.input);
  if (input?.kind !== "writing-guided" || input.step !== "final")
    return undefined;
  const feedback = row.aiFeedback as CheckFeedback | null;
  if (!feedback || (feedback.state !== "ok" && feedback.state !== "failed"))
    return undefined;
  return outcomeOf(feedback, row.clientAttemptId, input.sentences, englishName);
}

/**
 * 쓰기 4~5 확인(plan-p11b 값 3 checkGuided). 그 프로필의 진행 중 쓰기 세션 · 그 활동 차례가 쓰기 문장 활동 · 문장 수가 수업 문장
 * 수인지 본 뒤 checkWriting(가변부 재료는 levelContextOf). 성공은 시도 { ai_feedback ok, score = 맞음 문장 수 ÷ 문장 수 }, 실패
 * (설정 · 거절 · 검증 · 출력 막힘 · 시간 · 연결 · 서버 · 한도 · 서버에서 던짐)는 시도 { ai_feedback failed, score 없음 } 와 skipped,
 * 안전 상한은 시도 없이 ai_resting.
 */
export async function checkGuided(
  raw: unknown,
  deps: WritingDeps = {},
): Promise<GuidedCheckOutcome> {
  const parsed = GuidedInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { sessionId, clientAttemptId, activityNo, sentences } = parsed.data;
  const db: Db = deps.db ?? getDb();
  const clock = deps.now ?? deps.clock ?? appNow;
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false, reason: "not_found" };

    // 같은 시도 id 는 저장한 결과 그대로(AI 를 다시 부르지 않음)
    const [same] = await db
      .select({
        clientAttemptId: attempts.clientAttemptId,
        activityNo: attempts.activityNo,
        input: attempts.input,
        aiFeedback: attempts.aiFeedback,
        sessionId: attempts.sessionId,
      })
      .from(attempts)
      .where(eq(attempts.clientAttemptId, clientAttemptId));
    if (same) {
      if (same.sessionId !== sessionId || same.activityNo !== activityNo)
        return { ok: false, reason: "invalid" };
      return (
        storedOutcome(same, profile.englishName) ?? {
          ok: false,
          reason: "invalid",
        }
      );
    }

    const [row] = await db
      .select({ session: sessions, lesson: lessons })
      .from(sessions)
      .innerJoin(lessons, eq(lessons.id, sessions.lessonId))
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.profileId, profile.id),
          eq(sessions.status, "in_progress"),
          eq(sessions.area, "writing"),
        ),
      );
    if (!row || row.session.unit === null)
      return { ok: false, reason: "not_found" };
    const lesson = LESSON_SCHEMAS.writing.parse(row.lesson.content);
    const content = lesson.content;
    if (content.shape !== "guided") return { ok: false, reason: "not_found" };
    const level = row.session.level ?? row.lesson.level;
    const activities = activitiesOf({
      area: "writing",
      level,
      content,
      ...(row.session.writingPart ? { part: row.session.writingPart } : {}),
    });
    if (activities[activityNo - 1]?.kind !== "writing-guided")
      return { ok: false, reason: "not_found" };
    if (sentences.length !== content.sentences.length)
      return { ok: false, reason: "invalid" };
    const input = {
      v: INPUT_VERSION,
      kind: "writing-guided",
      step: "final",
      sentences,
    } as const;
    // 글자 수 상한 · NUL 글자(시도 꼴 — 대기열과 같은 규칙)
    if (!parseAttemptInput(input)) return { ok: false, reason: "invalid" };

    // 같은 활동의 끝 시도가 이미 있으면(다른 기기 · 다른 시도 id) 그 결과
    const done = await db
      .select({
        clientAttemptId: attempts.clientAttemptId,
        activityNo: attempts.activityNo,
        input: attempts.input,
        aiFeedback: attempts.aiFeedback,
      })
      .from(attempts)
      .where(
        and(
          eq(attempts.sessionId, sessionId),
          eq(attempts.activityNo, activityNo),
        ),
      );
    for (const earlier of done) {
      const stored = storedOutcome(earlier, profile.englishName);
      if (stored) return stored;
    }

    let outcome:
      | AiOutcome<WritingCheckOutput>
      | { ok: false; reason: typeof SERVER_ERROR_REASON };
    try {
      const ctx = await levelContextOf(
        {
          area: "writing",
          level,
          unit: row.session.unit,
          revision: row.session.seedRevision ?? row.lesson.revision,
        },
        { db },
      );
      outcome = await checkWriting(
        { ...ctx, task: content.task, example: content.example, sentences },
        { profileId: profile.id, sessionId, level },
        deps,
      );
    } catch (error) {
      // 호출부 결함 · 가변부 재료 없음은 서버 기록에 이름만 남기고 확인 없이 넘어간다(8절 표 '서버 오류')
      console.error(`쓰기 확인 실패(${dbErrorTag(error)})`);
      outcome = { ok: false, reason: SERVER_ERROR_REASON };
    }
    // 1-가 하루 안전 상한: 시도를 남기지 않는다(다음 학습일에 같은 화면에서 다시 냄 — C50 (2))
    if (!outcome.ok && outcome.reason === "safety_cap")
      return { ok: false, reason: "ai_resting" };

    const feedback: CheckFeedback = outcome.ok
      ? { state: "ok", value: outcome.value }
      : { state: "failed", reason: outcome.reason };
    const score = outcome.ok
      ? cleanSentenceRate(outcome.value.sentences.map((s) => s.correct))
      : null;
    const inserted = await db
      .insert(attempts)
      .values({
        sessionId,
        clientAttemptId,
        activityNo,
        input,
        attemptedAt: clock(),
        aiFeedback: feedback,
        score,
        wordCount: sentences.reduce((sum, s) => sum + wordsIn(s).length, 0),
        status: "done",
      })
      .onConflictDoNothing({ target: attempts.clientAttemptId })
      .returning({ id: attempts.id });
    if (inserted.length === 0) {
      // 같은 시도 id 가 동시에 들어와 먼저 저장된 쪽이 있다 — 그 결과
      const [first] = await db
        .select({
          clientAttemptId: attempts.clientAttemptId,
          activityNo: attempts.activityNo,
          input: attempts.input,
          aiFeedback: attempts.aiFeedback,
        })
        .from(attempts)
        .where(eq(attempts.clientAttemptId, clientAttemptId));
      const stored = first
        ? storedOutcome(first, profile.englishName)
        : undefined;
      if (stored) return stored;
    }
    return outcomeOf(feedback, clientAttemptId, sentences, profile.englishName);
  } catch (error) {
    console.error(`쓰기 확인 저장 실패(${dbErrorTag(error)})`);
    return { ok: false, reason: "unavailable" };
  }
}

import "server-only";
// 말하기 평가 서버 함수 — 질문 답 몫(plan-p11c 값 1 의 evaluateAnswer 질문 답, 가르치고 배우는 수업 plan 다 · 정한 것 5 · 6 · 7,
// 델타 spec 설계 8 · 10, 정본 15절 AC-22k · AC-N19). 그림 보고 말하기 · 발표 · 확인 질문은 P11c 에 남는다.
// AI 판정 단계(level_specs questions.acceptedMin 0 — 3단계부터)의 혼자 질문 답만 여기로 온다. AI 는 P9c 공개 함수(@/server/ai)로만 부르고
// (모델은 목적 speaking_eval 의 설정값 ai.model.speaking_eval, 응답은 규격 Zod 로 검증), 판정 합치기(judgeSpeakingQuestion — 의미 검사 →
// 두 묶음 → AI 판정)를 서버가 다시 해 끝 시도의 judge 칸 · 점수(맞음 1 · 부분 0.5 · 다시 0)를 정한다(서버 값이 정본).
// 같은 시도 id(또는 같은 활동의 끝 시도)가 있으면 저장한 결과를 그대로 돌려준다(AI 를 두 번 부르지 않음). 1-가 하루 안전 상한('AI 쉬는 중')은
// 시도를 남기지 않고 ai_resting — 화면이 skipAfterAiRest 의 활동을 건너뜀 끝 시도(skipped ai_rest)로 대기열에 넣는다. 그 밖 AI 실패는 판정
// 없는 끝 시도(점수 없음)와 skipped(8절). 소리를 못 들려준 채 낸 답(techError)은 AI 를 부르지 않는 U 끝 시도다(설계 10).
// 아이 글 · AI 글은 로그 · 오류에 넣지 않는다(이름 · 코드만, safe-error). A9 확정 전이라 의사소통 정답은 judge.communicative 표시만 남기고
// 점수는 맞음 그대로다(C182 (3)).
// '같이 말해 볼까요' 뒤 말(echo — 가르치고 묶음 라-3 fix 1 · 델타 spec 설계 8 '같은 행의 도움받은 시도'): 화면이 같은 시도 id 와 echo 로 다시 부르면
// AI 를 다시 부르지 않고 저장된 그 끝 시도 행의 input.echo · word_count 에 한 번만 합친다(이미 echo 가 있으면 그대로 — 다시 보냄 · 끊김에도 한 번).
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { SpeakingAnswerOutput } from "@/core/ai/calls/speaking";
import { speakingRulesOf } from "@/core/ai/calls/speaking";
import { fillNameDeep } from "@/core/ai/mask";
import type { LessonOf } from "@/core/seed/schema/lesson";
import type { SpeakingLevelSpec } from "@/core/seed/schema/reference";
import { SPEAKING_JUDGEMENTS } from "@/core/seed/structure";
import {
  type AttemptInput,
  appActivityResult,
  INPUT_VERSION,
  parseAttemptInput,
  questionJudgeContextOf,
} from "@/core/session/attempt";
import {
  aiAnswerScore,
  judgeableQuestion,
  judgeSpeakingQuestion,
  type SpeakingJudgement,
} from "@/core/speaking/judge";
import { lessons } from "@/db/schema/content";
import { attempts, sessions } from "@/db/schema/learning";
import { type AiDeps, type AiOutcome, evaluateSpeaking } from "@/server/ai";
import { now as appNow } from "@/server/clock";
import { type Db, getDb } from "@/server/db";
import { dbErrorTag } from "@/server/db/safe-error";
import { readHouseholdProfile } from "@/server/profile";
import { seedHomophones } from "@/server/seed-lists";
import {
  lemmaEntriesOf,
  type SessionContext,
  scoringOf,
  sessionContextOf,
} from "@/server/session";
import { levelContextOf } from "@/server/session/ai-context";
import { meaningWordsOf } from "@/server/speaking/words";

/** 활동 번호 상한(세션 서버의 시도 겉꼴과 같은 기술 값). */
const ACTIVITY_NO_MAX = 200;
/** AI 를 부르다 서버에서 던진 때의 실패 까닭(호출부 결함 · 가변부 재료 없음 — 8절 표의 '서버 오류' 갈래). */
const SERVER_ERROR_REASON = "error";

export type SpeakingDeps = AiDeps & {
  /** 시도 저장 시각(없으면 deps.clock, 그것도 없으면 앱 시계). */
  now?: () => Date;
  /** 동음이의어 묶음(시드 lists/homophones.json). 시험이 바꾼다. */
  homophones?: () => string[][];
};

const AnswerInputSchema = z.strictObject({
  sessionId: z.uuid(),
  clientAttemptId: z.uuid(),
  activityNo: z.int().min(1).max(ACTIVITY_NO_MAX),
  /** 판정할 인식 글(첫 인식 글 — 화면이 한 문장 답의 듣기를 끝낸 글). */
  transcript: z.string(),
  /** 그 활동의 다시 듣기 갈래 실패 수(7절, 시도 꼴 failures). */
  failures: z.int().min(0).optional(),
  /** 이야기 다시 듣기를 썼는가(델타 spec 설계 9 — 기록만). */
  story: z.strictObject({ replayed: z.boolean() }).optional(),
  /** 소리를 못 들려준 채 낸 답(UI · UX 5-나 칸 — U, AI 를 부르지 않음). */
  techError: z.literal("speak_fail").optional(),
  /** '같이 말해 볼까요' 뒤 말 — 같은 시도 id 의 저장된 끝 시도에 합친다(그 시도가 없으면 invalid). */
  echo: z.string().optional(),
});

/** 질문 답 평가 결과. 판정(judgement)은 화면이 반응('잘 말했어요' · 바른 답 들려주기)을 고르는 데만 쓰고 글로 그리지 않는다(AC-5d). */
export type SpeakingAnswerOutcome =
  | {
      ok: true;
      /** 합친 판정(judge.final — AI 원 판정이 아니다). */
      judgement: SpeakingJudgement;
      /** AI 피드백 한 문장. 앱이 AI 판정을 바꾼 때(의미 검사 · 묶음)는 AI 글이 반응과 어긋나므로 null. */
      feedback: string | null;
      /** 들려줄 바른 답. 앱이 맞음을 '다시'로 바꾼 때는 시드 바른 답(AI 글은 아이 답을 되풀이할 수 있다). */
      correctSentence: string;
      grammarNotes: string[];
    }
  | {
      ok: false;
      reason:
        | "skipped" // 판정 없이 다음 문항(AI 실패 · 소리 없음 — 점수에서 뺀다, 8절)
        | "ai_resting" // 1-가 하루 안전 상한(시도를 남기지 않음 — 화면이 남은 AI 질문을 건너뛴다)
        | "invalid"
        | "not_found" // 그 프로필의 진행 중 말하기 세션 · AI 판정 혼자 질문 활동이 아님
        | "unavailable"; // 저장을 못 함(DB) — 화면이 같은 시도 id 로 다시 부른다
    };

/** attempts.ai_feedback 에 두는 말하기 평가 결과(가린 글 그대로 — {NAME} 은 돌려줄 때 채운다). */
const StoredFeedbackSchema = z.discriminatedUnion("state", [
  z.strictObject({
    state: z.literal("ok"),
    value: z.strictObject({
      judgement: z.enum(SPEAKING_JUDGEMENTS),
      feedback: z.string(),
      correctSentence: z.string(),
      grammarNotes: z.array(z.string()),
    }),
  }),
  z.strictObject({ state: z.literal("failed"), reason: z.string() }),
]);
type StoredFeedback = z.infer<typeof StoredFeedbackSchema>;

type QuestionItem = LessonOf["speaking"]["content"]["questions"][number];
type QuestionInput = Extract<AttemptInput, { kind: "question" }>;

/** 그 활동이 AI 판정 혼자 질문이면 그 질문(짝 · 같이 해 보기 · 1~2단계 앱 판정 질문은 undefined). */
function aiQuestionOf(
  ctx: SessionContext,
  activityNo: number,
): { index: number; item: QuestionItem } | undefined {
  if (ctx.area !== "speaking" || ctx.appJudged) return undefined;
  const activity = ctx.activities[activityNo - 1];
  if (activity?.kind !== "question") return undefined;
  const item = (ctx.lesson as LessonOf["speaking"]).content.questions[
    activity.index
  ];
  return item ? { index: activity.index, item } : undefined;
}

/**
 * 돌려줄 결과(저장한 끝 시도 · 방금 받은 AI 결과에서 같은 함수로). 합친 판정이 AI 판정과 다르면 AI 피드백 · 문법 지적을 내지 않고,
 * 맞음을 '다시'로 바꾼 때는 시드 바른 답을 들려준다. AI 글의 {NAME} 은 영어 이름으로 채운다(6.1 — 저장은 가린 글 그대로).
 */
function outcomeOf(
  feedback: StoredFeedback | undefined,
  input: QuestionInput,
  item: QuestionItem,
  englishName: string,
): SpeakingAnswerOutcome {
  if (feedback?.state !== "ok") return { ok: false, reason: "skipped" };
  const value = fillNameDeep(feedback.value, englishName);
  const judgement = input.judge?.final ?? value.judgement;
  const changed = judgement !== value.judgement;
  return {
    ok: true,
    judgement,
    feedback: changed ? null : value.feedback,
    correctSentence:
      changed && judgement !== "correct"
        ? (item.modelAnswer ?? value.correctSentence)
        : value.correctSentence,
    grammarNotes: changed ? [] : value.grammarNotes,
  };
}

type StoredRow = { input: unknown; aiFeedback: unknown };

/** 저장된 질문 답 끝 시도에서 결과를 다시 만든다(꼴이 아니면 undefined). */
function storedOutcome(
  row: StoredRow,
  item: QuestionItem,
  englishName: string,
): SpeakingAnswerOutcome | undefined {
  const input = parseAttemptInput(row.input);
  if (input?.kind !== "question" || input.step !== "final") return undefined;
  if (input.techError !== undefined || input.skipped !== undefined)
    return { ok: false, reason: "skipped" };
  const feedback = StoredFeedbackSchema.safeParse(row.aiFeedback);
  if (!feedback.success) return undefined;
  return outcomeOf(feedback.data, input, item, englishName);
}

const wordsIn = (text: string) => text.trim().split(/\s+/).filter(Boolean);

/**
 * 저장된 질문 끝 시도에 '같이 말해 볼까요' 뒤 말을 합친 시도(순수 — 델타 spec 설계 8 · 정본 3.8 '같은 행의 도움받은 시도', 시도 꼴 question 의 echo
 * 칸). 질문 끝 시도가 아니거나, 이미 echo 가 있거나(한 번만), 빈 글이면 그대로 돌려준다.
 */
export function echoMergedInput(
  input: AttemptInput,
  echo: string,
): AttemptInput {
  if (input.kind !== "question" || input.step !== "final") return input;
  const text = echo.trim();
  if (input.echo !== undefined || text === "") return input;
  return { ...input, echo: text };
}

/**
 * 말하기 질문 답 평가(plan-p11c 값 1 evaluateAnswer 의 질문 답 몫). 그 프로필의 진행 중 말하기 세션 · 그 활동 차례가 AI 판정 혼자
 * 질문인지 본 뒤 evaluateSpeaking(mode answer — 질문 · 시드 바른 답 · 질문 직전 이야기 storyEn · 가변부 재료 levelContextOf · 문법 지적
 * 상한 speakingRulesOf)을 부르고, 판정 합치기를 서버가 다시 한다.
 */
export async function evaluateAnswer(
  raw: unknown,
  deps: SpeakingDeps = {},
): Promise<SpeakingAnswerOutcome> {
  const parsed = AnswerInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const {
    sessionId,
    clientAttemptId,
    activityNo,
    transcript,
    failures = 0,
    story,
    techError,
    echo,
  } = parsed.data;
  if (techError === undefined && transcript.trim() === "")
    return { ok: false, reason: "invalid" };
  const db: Db = deps.db ?? getDb();
  const clock = deps.now ?? deps.clock ?? appNow;
  const homophones = (deps.homophones ?? seedHomophones)();
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
          eq(sessions.area, "speaking"),
        ),
      );
    if (!row || row.session.unit === null)
      return { ok: false, reason: "not_found" };
    const ctx = await sessionContextOf(db, row.session, row.lesson, profile.id);
    const question = aiQuestionOf(ctx, activityNo);
    if (!question) return { ok: false, reason: "not_found" };
    const { item } = question;

    // 같은 시도 id 는 저장한 결과 그대로(AI 를 다시 부르지 않음)
    const [same] = await db
      .select({
        id: attempts.id,
        sessionId: attempts.sessionId,
        activityNo: attempts.activityNo,
        input: attempts.input,
        aiFeedback: attempts.aiFeedback,
      })
      .from(attempts)
      .where(eq(attempts.clientAttemptId, clientAttemptId));
    if (same) {
      if (same.sessionId !== sessionId || same.activityNo !== activityNo)
        return { ok: false, reason: "invalid" };
      // '같이 말해 볼까요' 뒤 말: 그 끝 시도 행에 한 번만 합친다(AI 는 다시 부르지 않음 — 같은 행의 도움받은 시도)
      if (echo !== undefined) {
        const stored = parseAttemptInput(same.input);
        const merged = stored ? echoMergedInput(stored, echo) : undefined;
        const activity = ctx.activities[activityNo - 1];
        if (
          stored &&
          merged &&
          merged !== stored &&
          activity &&
          parseAttemptInput(merged)
        ) {
          const scoring = scoringOf(
            ctx,
            homophones,
            await lemmaEntriesOf(db, ctx.lesson.unitWords),
            await meaningWordsOf(db, ctx.lesson, homophones),
          );
          await db
            .update(attempts)
            .set({
              input: merged,
              wordCount: appActivityResult(
                activity,
                ctx.lesson,
                merged,
                scoring,
              ).wordCount,
            })
            // 동시에 둘이 와도 한 번만(먼저 합친 쪽이 이긴다)
            .where(
              and(
                eq(attempts.id, same.id),
                sql`${attempts.input} ->> 'echo' is null`,
              ),
            );
        }
      }
      return (
        storedOutcome(same, item, profile.englishName) ?? {
          ok: false,
          reason: "invalid",
        }
      );
    }
    // echo 는 저장된 끝 시도에만 합친다(판정 전 시도에는 없음)
    if (echo !== undefined) return { ok: false, reason: "invalid" };
    if (row.session.status !== "in_progress")
      return { ok: false, reason: "not_found" };

    // 같은 활동의 끝 시도가 이미 있으면(다른 기기 · 다른 시도 id) 그 결과
    const done = await db
      .select({ input: attempts.input, aiFeedback: attempts.aiFeedback })
      .from(attempts)
      .where(
        and(
          eq(attempts.sessionId, sessionId),
          eq(attempts.activityNo, activityNo),
        ),
      );
    for (const earlier of done) {
      const stored = storedOutcome(earlier, item, profile.englishName);
      if (stored) return stored;
    }

    const base: QuestionInput = {
      v: INPUT_VERSION,
      kind: "question",
      step: "final",
      heard: [transcript],
      failures,
      ...(story ? { story } : {}),
    };
    const scoring = scoringOf(
      ctx,
      homophones,
      await lemmaEntriesOf(db, ctx.lesson.unitWords),
      await meaningWordsOf(db, ctx.lesson, homophones),
    );
    const activity = ctx.activities[activityNo - 1];
    if (!activity) return { ok: false, reason: "not_found" };
    const save = async (
      input: AttemptInput,
      aiFeedback: StoredFeedback | undefined,
      score: number | null,
    ) => {
      // 글자 수 상한 · NUL 글자(시도 꼴 — 대기열과 같은 규칙)
      if (!parseAttemptInput(input)) return false;
      const inserted = await db
        .insert(attempts)
        .values({
          sessionId,
          clientAttemptId,
          activityNo,
          input,
          attemptedAt: clock(),
          ...(aiFeedback ? { aiFeedback } : {}),
          score,
          wordCount:
            appActivityResult(activity, ctx.lesson, input, scoring).wordCount ??
            wordsIn(transcript).length,
          status: "done",
        })
        .onConflictDoNothing({ target: attempts.clientAttemptId })
        .returning({ id: attempts.id });
      return inserted.length > 0;
    };

    // 소리를 못 들려준 채 낸 답: AI 를 부르지 않는 U 끝 시도(설계 10 · C179 (2))
    if (techError !== undefined) {
      const input: QuestionInput = { ...base, techError };
      if (!(await save(input, undefined, null)))
        return storedAfterRace(db, clientAttemptId, item, profile.englishName);
      return { ok: false, reason: "skipped" };
    }

    let outcome:
      | AiOutcome<SpeakingAnswerOutput>
      | { ok: false; reason: typeof SERVER_ERROR_REASON };
    try {
      const levelCtx = await levelContextOf(
        {
          area: "speaking",
          level: ctx.level,
          unit: row.session.unit,
          revision: row.session.seedRevision ?? row.lesson.revision,
        },
        { db },
      );
      const rules = speakingRulesOf(ctx.spec as unknown as SpeakingLevelSpec);
      outcome = (await evaluateSpeaking(
        {
          mode: "answer",
          ...levelCtx,
          question: item.en,
          scene: null,
          // 질문 직전 이야기(시드 글 — 정한 것 5). 이야기 없이는 'Do Dan and Tess eat rice?' 답의 맞고 틀림을 정할 수 없다
          story: item.storyEn ?? null,
          transcript,
          grammarNoteMax: rules.grammarNoteMax,
          seedCorrectAnswer: item.modelAnswer ?? null,
        },
        { profileId: profile.id, sessionId, level: ctx.level },
        deps,
      )) as AiOutcome<SpeakingAnswerOutput>;
    } catch (error) {
      // 호출부 결함 · 가변부 재료 없음은 서버 기록에 이름만 남기고 판정 없이 넘어간다(8절 표 '서버 오류')
      console.error(`말하기 평가 실패(${dbErrorTag(error)})`);
      outcome = { ok: false, reason: SERVER_ERROR_REASON };
    }
    // 1-가 하루 안전 상한: 시도를 남기지 않는다(화면이 남은 AI 질문을 건너뜀 끝 시도로 — plan-p11c 값 3 · 4)
    if (!outcome.ok && outcome.reason === "safety_cap")
      return { ok: false, reason: "ai_resting" };

    if (!outcome.ok) {
      const feedback: StoredFeedback = {
        state: "failed",
        reason: outcome.reason,
      };
      if (!(await save(base, feedback, null)))
        return storedAfterRace(db, clientAttemptId, item, profile.englishName);
      return { ok: false, reason: "skipped" };
    }

    // 판정 합치기(설계 8 · 정한 것 6): 허용 답이 있는 문항(1~3단계)은 의미 검사 → 두 묶음 → AI 판정, 없으면 AI 판정 그대로
    const ai = outcome.value.judgement;
    const judge = judgeableQuestion(item)
      ? judgeSpeakingQuestion(
          item,
          transcript,
          questionJudgeContextOf(scoring),
          ai,
        )
      : undefined;
    const input: QuestionInput = judge ? { ...base, judge } : base;
    const feedback: StoredFeedback = { state: "ok", value: outcome.value };
    if (!(await save(input, feedback, aiAnswerScore(judge?.final ?? ai))))
      return storedAfterRace(db, clientAttemptId, item, profile.englishName);
    return outcomeOf(feedback, input, item, profile.englishName);
  } catch (error) {
    console.error(`말하기 평가 저장 실패(${dbErrorTag(error)})`);
    return { ok: false, reason: "unavailable" };
  }
}

/** 같은 시도 id 가 동시에 들어와 먼저 저장된 쪽이 있다 — 그 결과. */
async function storedAfterRace(
  db: Db,
  clientAttemptId: string,
  item: QuestionItem,
  englishName: string,
): Promise<SpeakingAnswerOutcome> {
  const [first] = await db
    .select({ input: attempts.input, aiFeedback: attempts.aiFeedback })
    .from(attempts)
    .where(eq(attempts.clientAttemptId, clientAttemptId));
  return (
    (first ? storedOutcome(first, item, englishName) : undefined) ?? {
      ok: false,
      reason: "invalid",
    }
  );
}

// 말하기 3단계 가르치는 수업 통합 시험의 준비 조각(가르치고 배우는 수업 plan 다 — speaking-eval · retry 가 같이 쓴다).
// 시험 시드(1단계 수업 · 12단계 규격)에 3단계 단원 1 정규 시드 말하기 수업(teach 칸, teachSeedLessons)을 3단계 단원 1 배정 수업 1 로
// 더하고, 말하기 3단계에서 시작한 집으로 연다. 3단계 말하기 규격은 질문 답을 AI 로 판정한다(questions.acceptedMin 0).
// AI 는 P9a 가짜 Anthropic(fetch 자리)이고 응답 판정은 시험이 고른다. 설계 숫자는 시험용 설정(TEST_SETTINGS)에서 읽는다.
import { randomUUID } from "node:crypto";
import { and, eq, isNull, max } from "drizzle-orm";
import { AVATARS, TOPIC_BUNDLES } from "@/core/profile/start";
import { LEVEL_MAX } from "@/core/seed/structure";
import { lessons } from "@/db/schema/content";
import { profiles } from "@/db/schema/learning";
import { parentAlerts, parentAuth, settings } from "@/db/schema/operations";
import { SEED_REVISION_TABLES } from "@/db/schema/seed-revision";
import { createAnthropicClient } from "@/server/ai/client";
import type { Db } from "@/server/db";
import { saveFirstRun } from "@/server/profile";
import {
  loadSessionView,
  type SessionView,
  startLessonSession,
} from "@/server/session";
import type { SpeakingDeps } from "@/server/speaking";
import {
  createFakeAnthropic,
  type FakeAnthropic,
  type FakeReply,
  type FakeRule,
  messageBody,
} from "../fixtures/ai/fake-anthropic";
import { SAMPLE_FORBIDDEN } from "../fixtures/ai/sample-inputs";
import { teachSeedLessons } from "../fixtures/seed/builders";
import { TEST_SETTINGS } from "../fixtures/settings";

export const SPEAKING_TEACH = teachSeedLessons().speaking;
export const SPEAKING_LEVEL = 3;
export const SPEAKING_MODEL = TEST_SETTINGS["ai.model.speaking_eval"].value;
const THROUGH_KEY = "seed.complete_through_level";

export type SpeakingView = SessionView & { area: "speaking" };

async function latestRevision(db: Db): Promise<number> {
  let latest = 0;
  for (const table of SEED_REVISION_TABLES) {
    const [row] = await db.select({ r: max(table.revision) }).from(table);
    latest = Math.max(latest, Number(row?.r ?? 0));
  }
  return latest;
}

/** 범위 끝을 마지막 단계로 두고 3단계 단원 1 배정 수업 1 로 가르치는 말하기 수업을 넣는다(시드 적재 뒤 한 번). */
export async function insertTeachSpeakingLesson(db: Db): Promise<void> {
  await db
    .update(settings)
    .set({ value: LEVEL_MAX })
    .where(and(eq(settings.key, THROUGH_KEY), isNull(settings.profileId)));
  const revision = await latestRevision(db);
  const lesson = SPEAKING_TEACH;
  await db.insert(lessons).values({
    area: "speaking",
    level: SPEAKING_LEVEL,
    unit: 1,
    kind: "assigned",
    lessonNo: 1,
    topicVariant: 1,
    listTitle: lesson.title,
    content: {
      ...lesson,
      kind: "assigned",
      lessonNo: 1,
      variant: 1,
      revision,
      correction: 0,
    },
    newWords: [...lesson.newWords],
    unitWords: [...lesson.unitWords],
    generation: lesson.generation,
    revision,
    correction: 0,
  });
}

/** 집을 비우고 말하기 3단계에서 시작한 집을 새로 넣는다. */
export async function freshSpeakingHousehold(
  db: Db,
  savedAt: Date,
): Promise<void> {
  await db.delete(profiles);
  await db.delete(parentAuth);
  await db.delete(parentAlerts);
  const saved = await saveFirstRun(
    {
      pin: "246813",
      displayName: "모모",
      englishName: "Momo",
      avatar: AVATARS[0].id,
      topicBundle: TOPIC_BUNDLES[0].id,
      alphabetUnknown: false,
      startLevels: { speaking: SPEAKING_LEVEL },
      mic: { result: "not_checked" },
    },
    { db, now: () => savedAt },
  );
  if (!saved.ok) throw new Error("첫 실행 저장 실패");
}

/** 가르치는 말하기 수업 세션을 열고 화면 자료를 돌려준다. */
export async function openTeachSpeaking(
  db: Db,
  at: Date,
): Promise<SpeakingView> {
  const [row] = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(
      and(eq(lessons.area, "speaking"), eq(lessons.level, SPEAKING_LEVEL)),
    );
  if (!row) throw new Error("가르치는 말하기 수업 행 없음");
  const deps = { db, now: () => at, homophones: () => [] };
  const started = await startLessonSession(
    { lessonId: row.id, confirmAbort: false },
    deps,
  );
  if (!started.ok) throw new Error(`세션이 열려야 한다: ${started.reason}`);
  const view = await loadSessionView({ sessionId: started.sessionId }, deps);
  if (view?.area !== "speaking") throw new Error("말하기 화면 자료 없음");
  return view as SpeakingView;
}

const v2 = (kind: string, content: Record<string, unknown> = {}) => ({
  v: 2,
  kind,
  step: "final",
  ...content,
});

/**
 * 대기열 길로 낼 끝 시도(혼자 질문 · 짝 활동 빼고 — 모두 첫 시도에 맞힘). 혼자 질문 답은 서버 액션(evaluateAnswer)이 저장하고, 혼자 문항을
 * 다 맞히면 짝은 내지 않아 시도 행 없이 끝난다.
 */
export function appFinals(view: SpeakingView) {
  const { content, teach } = view.lesson;
  return view.activities.flatMap((activity, i) => {
    const at = (input: unknown) => [
      {
        clientAttemptId: randomUUID(),
        sessionId: view.sessionId,
        activityNo: i + 1,
        input,
      },
    ];
    switch (activity.kind) {
      case "today":
        return at(v2("today"));
      case "preview":
        return at(
          v2("preview", { shownWords: view.preview.map((w) => w.word) }),
        );
      case "model":
        return at(v2("model", { index: activity.index }));
      case "together": {
        const item = teach?.together[activity.index];
        if (!item) throw new Error("같이 해 보기 없음");
        return at(
          v2("together", {
            index: activity.index,
            tries: [
              {
                ...(item.answerNo === undefined
                  ? {}
                  : { choice: item.answerNo }),
                heard: item.modelAnswer ?? item.accepted[0],
              },
            ],
          }),
        );
      }
      case "repeat-word":
      case "repeat-sentence": {
        const list =
          activity.kind === "repeat-word"
            ? content.repeat.words
            : content.repeat.sentences;
        return at(
          v2(activity.kind, {
            heard: [list[activity.index] ?? ""],
            failures: 0,
          }),
        );
      }
      case "listening": {
        const l = content.listening[activity.index];
        if (!l) throw new Error("듣기 없음");
        return at(v2("listening", { tries: [l.answerNo] }));
      }
      default:
        return [];
    }
  });
}

/** 활동 목록에서 혼자 질문 index 의 활동 번호(1부터). */
export function questionNo(view: SpeakingView, index: number): number {
  const no = view.activities.findIndex(
    (a) => a.kind === "question" && a.index === index,
  );
  if (no < 0) throw new Error(`혼자 질문 ${index} 없음`);
  return no + 1;
}

/** 가짜 AI 말하기 평가 응답(판정은 시험이 고른다 — 피드백 · 바른 답은 금지어에 걸리지 않는 글). */
export function answerReply(
  judgement: "correct" | "partial" | "retry",
  correctSentence = "Yes, they wash the cups.",
): FakeReply {
  return {
    kind: "message",
    body: messageBody({
      model: SPEAKING_MODEL,
      json: {
        judgement,
        feedback: "이야기를 잘 듣고 말했어요.",
        correctSentence,
        grammarNotes: [],
      },
    }),
  };
}

/** 가짜 Anthropic 을 끼운 말하기 평가 의존성. */
export function speakingHarness(
  db: Db,
  rules: FakeRule[],
  at: Date,
): { fake: FakeAnthropic; deps: SpeakingDeps } {
  const fake = createFakeAnthropic(rules);
  const client = createAnthropicClient({
    env: { ANTHROPIC_API_KEY: "test-key" },
    fetch: fake.fetch,
  });
  return {
    fake,
    deps: {
      db,
      now: () => at,
      clock: () => at,
      client: () => client,
      lists: () => ({ forbidden: SAMPLE_FORBIDDEN }),
      homophones: () => [],
    },
  };
}

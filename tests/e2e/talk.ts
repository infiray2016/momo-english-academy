// 회화 e2e 도우미(plan-p13b 파일별 값 13). 시험용 시드에는 회화 수업이 없어(차례 6 공용 변경 2 전) 견본 빌더 talkCard(작은 틀 규격 —
// 시험용 시드와 같은 규격)의 카드를 lessons 행으로 넣고 진행 세션을 바로 넣어 /session/<id> 를 연다(목록을 거치지 않음 — P11 openLessonSession 꼴).
// 차례 5 는 인사 → 대화 토막만 본다: 견본 수업의 새 단어 · 단원 단어 · 오늘 쓸 말을 비워 오늘 쓸 말 · 말해 보기 토막이 건너뛰어지게 한다
// (그 조각은 차례 6). 가짜 SSE 규칙(talkReply)은 사용자 메시지 줄 '\nClosing: no'(JSON 본문 글)로 회화 턴만 고른다. 가짜 음성 대본은
// 시험 안에서 턴마다 만든다(start() 마다 차례로 하나). 아이 이름은 앱 안 이름(Momo)이다.
import type { Page } from "@playwright/test";
import { and, eq, max } from "drizzle-orm";
import type { TalkOutput } from "../../src/core/ai/calls/talk";
import type { TalkLesson } from "../../src/core/seed/schema/lesson";
import type {
  RecognitionRun,
  SpeechScript,
} from "../../src/core/speech/script";
import { lessons } from "../../src/db/schema/content";
import { SEED_REVISION_TABLES } from "../../src/db/schema/seed-revision";
import type { FakeSpeechRecord } from "../../src/lib/speech/fake-web-speech";
import { type FakeRule, messageBody } from "../fixtures/ai/fake-anthropic";
import {
  type CellPlace,
  smallReferenceSet,
  talkCard,
} from "../fixtures/seed/builders";
import { TEST_SETTINGS } from "../fixtures/settings";
import { e2eDb, insertSessions } from "./db";
import { insertHousehold } from "./household";

type LessonRow = typeof lessons.$inferSelect;

/** 회화 턴 모델(그 단계 구간, TEST_SETTINGS). */
export const TALK_MODEL_LOW = TEST_SETTINGS["ai.model.talk_turn.1-3"].value;
/** 회화 턴 요청만 고르는 본문 글(사용자 메시지 줄 — 고정부 설명과 겹치지 않게 줄바꿈부터). */
export const TURN_MARK = "\\nClosing: no";

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

/**
 * 인사 → 대화 견본 카드(차례 5): 새 단어 · 단원 단어 · 오늘 쓸 말을 비워 오늘 쓸 말 · 말해 보기 토막이 없다(a talkFlowOf).
 * 카드 턴 · 더 이야기할 거리 · 인사 질문은 견본 그대로다.
 */
export function greetingToTalkLesson(
  level: number,
  place: Partial<CellPlace> = {},
): TalkLesson {
  const lesson = talkCard(smallReferenceSet(), {
    level,
    unit: 1,
    kind: "assigned",
    lessonNo: 1,
    variant: 1,
    ...place,
  });
  return {
    ...lesson,
    newWords: [],
    unitWords: [],
    card: { ...lesson.card, todayWords: [] },
  };
}

/** 회화 견본 수업 하나를 lessons 행으로(판은 DB 최신 개정 · 정정 0, 검증 밖). */
export async function insertTalkLesson({
  level,
  lesson = greetingToTalkLesson(level),
}: {
  level: number;
  lesson?: TalkLesson;
}): Promise<LessonRow> {
  const revision = await latestRevision();
  const db = e2eDb();
  // 앞 시험이 넣은 같은 칸(내용이 다를 수 있음)을 지운다 — 그 칸의 세션은 집 비우기로 이미 지워졌다
  await db
    .delete(lessons)
    .where(
      and(
        eq(lessons.area, "talk"),
        eq(lessons.level, level),
        eq(lessons.unit, 1),
        eq(lessons.kind, lesson.kind),
        eq(lessons.lessonNo, lesson.lessonNo),
      ),
    );
  const [row] = await db
    .insert(lessons)
    .values({
      area: "talk",
      level,
      unit: 1,
      kind: lesson.kind,
      lessonNo: lesson.lessonNo,
      topicVariant: lesson.variant,
      listTitle: lesson.title,
      content: { ...lesson, revision, correction: 0 },
      newWords: [...lesson.newWords],
      unitWords: [...lesson.unitWords],
      generation: lesson.generation,
      revision,
      correction: 0,
    })
    .returning();
  if (!row) throw new Error("회화 견본 수업을 넣지 못했다");
  return row;
}

/** 회화를 그 단계에서 시작한 집(앱 안 이름 Momo). 프로필 id. */
export async function talkHousehold(level: number): Promise<string> {
  const { profileId } = await insertHousehold({ startLevels: { talk: level } });
  return profileId;
}

/** 그 회화 수업의 진행 세션(인사 토막)을 바로 넣는다. 세션 id. */
export async function openTalkSession(
  profileId: string,
  lesson: LessonRow,
): Promise<string> {
  const [sessionId] = await insertSessions([
    {
      profileId,
      area: "talk",
      level: lesson.level,
      unit: lesson.unit ?? 1,
      lessonId: lesson.id,
      kind: "regular",
      status: "in_progress",
      talkSegment: "greeting",
      startedAt: new Date(),
      seedRevision: lesson.revision,
      seedCorrection: lesson.correction,
    },
  ]);
  if (!sessionId) throw new Error("회화 세션 없음");
  return sessionId;
}

/** 회화 턴 응답 칸(빈 값 + 덮어쓴 칸, tori_en 먼저 — 6.2 규격 차례). */
export function talkAnswer(over: Partial<TalkOutput> = {}): TalkOutput {
  return {
    tori_en: "Nice!",
    tori_ko: "좋아!",
    recast: "",
    explanation: "",
    new_words: [],
    self_used_words: [],
    mission_done: [],
    stuck: false,
    card_question_no: 0,
    next_question_en: "",
    next_question_ko: "",
    next_hint_ko: "",
    next_hints: [],
    next_usable_phrases: [],
    next_targets: [],
    next_answer_example: "",
    farewell: "",
    farewell_ko: "",
    good_lines: [],
    next_time_lines: [],
    summary: "",
    ...over,
  };
}

/** 회화 턴 한 번(가짜 SSE — 조각 수 · 조각 사이 기다림 · 첫 조각 늦춤 · 끊음). */
export function talkReply(
  over: Partial<TalkOutput> = {},
  {
    chunks = 6,
    delayMs,
    firstDelayMs,
    model = TALK_MODEL_LOW,
  }: {
    chunks?: number;
    delayMs?: number;
    firstDelayMs?: number;
    model?: string;
  } = {},
): FakeRule {
  return {
    when: { bodyIncludes: TURN_MARK },
    reply: {
      kind: "stream",
      body: messageBody({ model, json: talkAnswer(over) }),
      chunks,
      ...(delayMs === undefined ? {} : { delayMs }),
      ...(firstDelayMs === undefined ? {} : { firstDelayMs }),
    },
    times: 1,
  };
}

/** 한 문장을 말하고 조용해지는 듣기(앱이 stop 하면 끝). */
export function saidRun(text: string): RecognitionRun {
  return {
    events: [
      { at: 50, type: "start" },
      { at: 100, type: "audiostart" },
      { at: 150, type: "speechstart" },
      {
        at: 300,
        type: "result",
        results: [{ transcript: text, isFinal: true }],
      },
    ],
    onStop: [{ at: 20, type: "end" }],
  };
}

/** 회화 e2e 대본: 듣기마다 차례로 하나, 읽어 주기는 짧게(시험 시간). */
export function talkScript(runs: RecognitionRun[]): SpeechScript {
  return {
    name: "talk-e2e",
    source: "손으로 씀 — 회화 e2e(시험 안에서 턴마다 만듦)",
    expose: { recognition: "webkit", synthesis: true },
    recognitions: runs,
    synthesis: {
      voices: [
        {
          name: "Test English (US)",
          lang: "en-US",
          localService: true,
          default: true,
        },
      ],
      utterances: [{ startAfter: 0, endAfter: 30 }],
    },
  };
}

/** 가짜 음성 기록(읽어 준 글 · 빠르기). */
export async function speechRecord(page: Page): Promise<FakeSpeechRecord> {
  return page.evaluate(
    () =>
      (window as unknown as { __fakeSpeech: FakeSpeechRecord }).__fakeSpeech,
  );
}

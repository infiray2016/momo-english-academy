// 회화 e2e 도우미(plan-p13b 파일별 값 13). 시험용 시드에는 회화 수업이 없어(공용 변경 2 전) 견본 빌더 talkCard(작은 틀 규격 —
// 시험용 시드와 같은 규격)의 카드를 lessons 행으로 넣고 진행 세션을 바로 넣어 /session/<id> 를 연다(목록을 거치지 않음 — P11 openLessonSession 꼴).
// 인사 → 대화만 보는 시험은 greetingToTalkLesson(오늘 쓸 말 비움 — 오늘 쓸 말 · 말해 보기 토막이 건너뛰어짐), 다섯 토막을 다 보는 시험은
// fullTalkLesson(차례 6 — 오늘 쓸 말 · 말해 보기 예문 그대로, 단원 단어 = 새 단어라 오늘 쓸 말이 카드 차례 그대로). 가짜 SSE 규칙(talkReply)은
// 사용자 메시지 줄 '\nClosing: no'(JSON 본문 글)로 회화 턴만 고른다. 가짜 음성 대본은 시험 안에서 턴마다 만든다(start() 마다 차례로 하나).
// 아이 이름은 앱 안 이름(Momo)이다.
import type { Page } from "@playwright/test";
import { and, eq, inArray, max } from "drizzle-orm";
import type { TalkOutput } from "../../src/core/ai/calls/talk";
import { learningDayOf } from "../../src/core/learning-day";
import type { TalkLesson } from "../../src/core/seed/schema/lesson";
import type {
  RecognitionRun,
  SpeechScript,
} from "../../src/core/speech/script";
import { lessons, vocab } from "../../src/db/schema/content";
import { vocabProgress } from "../../src/db/schema/learning";
import { aiCalls, settings } from "../../src/db/schema/operations";
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

/**
 * 다섯 토막 견본(차례 6): 인사 → 오늘 쓸 말(카드 새 단어) → 말해 보기(1~3단계 — 예문 뜻이 있는 예문) → 대화 → 정리. 단원 단어를 새 단어로
 * 좁혀 오늘 쓸 말에 덧붙는 단어(안 만난 단원 단어)가 없게 한다 — 시험이 카드만 보고 따라 말할 차례를 안다.
 */
export function fullTalkLesson(
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
  if (lesson.card.todayWords.length === 0)
    throw new Error("견본 꼴 — 오늘 쓸 말이 있는 배정 수업");
  return { ...lesson, unitWords: [...lesson.newWords] };
}

/** 다지기 견본(1단계 등): 새 단어 · 오늘 쓸 말 없음, 카드 턴은 모두 '다시 묻는 턴'(단원 단어 전부를 돌림 — 견본 빌더). */
export function reinforceTalkLesson(level: number): TalkLesson {
  return talkCard(smallReferenceSet(), {
    level,
    unit: 1,
    kind: "reinforce",
    lessonNo: 1,
    variant: 1,
  });
}

/**
 * 앞 회화 세션에서 그 단원 단어를 만났다(vocab_progress '말함' 행 — 처음 스냅숏의 metBefore). known 이면 '안다'까지(다지기 수업의 오늘 쓸 말이
 * 비어 따라 말하기 토막이 건너뛰어진다 — 3.3).
 */
export async function meetSayWords(
  profileId: string,
  words: readonly string[],
  { known = false }: { known?: boolean } = {},
): Promise<void> {
  const db = e2eDb();
  const rows = await db
    .select({ id: vocab.id, word: vocab.word })
    .from(vocab)
    .where(inArray(vocab.word, [...words]));
  const day = learningDayOf(
    new Date(Date.now() - DAY_MS),
    TEST_SETTINGS["app.timezone"].value,
    TEST_SETTINGS["app.day_start_hour"].value,
  );
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.word)) continue;
    seen.add(row.word);
    await db.insert(vocabProgress).values({
      profileId,
      vocabId: row.id,
      state: "say",
      known,
      firstArea: "talk",
      metAreas: ["talk"],
      firstMetDay: day,
      saidDays: [],
    });
  }
}

/** 하루(ms, 단위 바꿈 상수 — 앞 세션의 학습일). */
const DAY_MS = 86_400_000;

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

/** 그 회화 수업의 진행 세션(인사 토막)을 바로 넣는다(kind 기본 정규, 다시 하기는 retry). 세션 id. */
export async function openTalkSession(
  profileId: string,
  lesson: LessonRow,
  { kind = "regular" }: { kind?: "regular" | "retry" } = {},
): Promise<string> {
  const [sessionId] = await insertSessions([
    {
      profileId,
      area: "talk",
      level: lesson.level,
      unit: lesson.unit ?? 1,
      lessonId: lesson.id,
      kind,
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

/** 회화 턴 응답 칸(빈 값 + 덮어쓴 칸, stuck · tori_en 먼저 — 6.2 규격 차례, C127). */
export function talkAnswer(over: Partial<TalkOutput> = {}): TalkOutput {
  return {
    stuck: false,
    tori_en: "Nice!",
    tori_ko: "좋아!",
    recast: "",
    explanation: "",
    new_words: [],
    self_used_words: [],
    mission_done: [],
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

/** 회화 e2e 대본: 듣기마다 차례로 하나, 읽어 주기는 짧게(시험 시간 — utterMs 로 길게 할 수 있음). */
export function talkScript(
  runs: RecognitionRun[],
  { utterMs = 30 }: { utterMs?: number } = {},
): SpeechScript {
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
      utterances: [{ startAfter: 0, endAfter: utterMs }],
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

/** 인식 오류로 끝나는 듣기(no-speech · not-allowed · audio-capture …). */
export function failingRun(error: string, at = 100): RecognitionRun {
  return {
    events: [
      { at: 50, type: "start" },
      { at, type: "error", error },
      { at: at + 10, type: "end" },
    ],
  };
}

/**
 * 1-가 하루 안전 상한에 닿은 날(C80): 이 프로필의 ai.safety_daily_calls 를 1 로 두고 오늘 학습일 호출 한 행을 넣는다(쓰기 e2e 와 같은 꼴).
 */
export async function reachSafetyCap(profileId: string): Promise<void> {
  const db = e2eDb();
  const [version] = await db
    .select({ v: max(settings.version) })
    .from(settings);
  await db.insert(settings).values({
    key: "ai.safety_daily_calls",
    scope: "profile",
    profileId,
    value: 1,
    version: Number(version?.v ?? 0) + 1,
  });
  const at = new Date();
  await db.insert(aiCalls).values({
    profileId,
    sessionId: null,
    calledAt: at,
    learningDay: learningDayOf(
      at,
      TEST_SETTINGS["app.timezone"].value,
      TEST_SETTINGS["app.day_start_hour"].value,
    ),
    purpose: "talk_turn",
    requestedModel: TALK_MODEL_LOW,
    answeredModel: TALK_MODEL_LOW,
    inputTokens: 0,
    outputTokens: 0,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    costUsd: "0.000000",
    priceMissing: false,
    latencyMs: null,
    status: "success",
    errorCode: null,
  });
}

/**
 * 끊긴 읽어 주기 기록(시험 쪽 — 가짜 음성은 그대로): 가짜 음성을 넣은 뒤 speechSynthesis.speak 를 감싸, 읽던 발화가 다음 읽기 ·
 * 멈춤으로 끊겨 'interrupted' 오류를 받으면 그 글을 남긴다. speechPage 뒤 page.goto 앞에 부른다(init script 차례).
 */
export async function recordInterruptedSpeech(page: Page): Promise<void> {
  await page.addInitScript(() => {
    type Utter = EventTarget & { text: string };
    const w = window as unknown as {
      speechSynthesis?: { speak(utterance: Utter): void };
      __interruptedSpeech?: string[];
    };
    const synth = w.speechSynthesis;
    if (!synth) return;
    const interrupted: string[] = [];
    w.__interruptedSpeech = interrupted;
    const speak = synth.speak.bind(synth);
    synth.speak = (utterance) => {
      utterance.addEventListener("error", (event) => {
        if ((event as Event & { error?: string }).error === "interrupted")
          interrupted.push(utterance.text);
      });
      speak(utterance);
    };
  });
}

/** 끊긴 읽어 주기 글(recordInterruptedSpeech 를 넣은 쪽). */
export async function interruptedSpeech(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      (window as unknown as { __interruptedSpeech?: string[] })
        .__interruptedSpeech ?? [],
  );
}

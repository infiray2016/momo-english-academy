// 회화 e2e 도우미(plan-p13b 파일별 값 13 · 회화 plan 묶음 11 · 12). 견본 빌더 talkCard(작은 틀 규격 — 시험용 시드와 같은 규격)의 새 꼴 카드
// (네 토막: 인사 → 짧은 준비 → 대화 → 정리)를 lessons 행으로 넣고 진행 세션을 바로 넣어 /session/<id> 를 연다(목록을 거치지 않음 — P11
// openLessonSession 꼴). 견본은 talkLessonCard, 가짜 SSE 규칙은 talkLessonReply(새 꼴 응답 칸 TalkLessonOutput — 사용자 메시지 줄
// '\nClosing: no'(JSON 본문 글)로 회화 턴만 고른다). 가짜 음성 대본은 시험 안에서 턴마다 만든다(start() 마다 차례로 하나). 옛 꼴 견본
// (talkCardV1 · talkReply)은 묶음 12 가 지웠다 — 옛 꼴 카드 세션은 열 때 닫힌다(정한 것 2). 아이 이름은 앱 안 이름(Momo)이다.
import type { Page } from "@playwright/test";
import { and, desc, eq, inArray, max } from "drizzle-orm";
import type { TalkLessonOutput } from "../../src/core/ai/calls/talk-lesson";
import type { TalkPrepMode } from "../../src/core/conversation/lesson-turns";
import { learningDayOf } from "../../src/core/learning-day";
import type { TalkLesson } from "../../src/core/seed/schema/lesson";
import { bandOf, LEVEL_MAX, LEVEL_MIN } from "../../src/core/seed/structure";
import type {
  RecognitionRun,
  SpeechScript,
} from "../../src/core/speech/script";
import { lessons, vocab } from "../../src/db/schema/content";
import { talkTurns, vocabProgress } from "../../src/db/schema/learning";
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
import { e2eDb, insertSessions, withHouseholdSetting } from "./db";
import { fakeAiRequests } from "./fake-ai";
import { insertHousehold } from "./household";

type LessonRow = typeof lessons.$inferSelect;

/** 회화 턴 모델(그 단계 구간, TEST_SETTINGS). */
export const TALK_MODEL_LOW = TEST_SETTINGS["ai.model.talk_turn.1-3"].value;
/** 회화 턴 요청만 고르는 본문 글(사용자 메시지 줄 — 고정부 설명과 겹치지 않게 줄바꿈부터). */
export const TURN_MARK = "\\nClosing: no";
/**
 * 끝맺음 호출의 본문 글(server/conversation/closing.ts — 'Closing: yes'). 끝맺음 호출은 앞 턴 사용자 메시지 전문을 대화 기록으로 다시
 * 보내므로 본문에 TURN_MARK 도 든다(core/ai/calls/talk-lesson.ts — e2e 분류 T6).
 */
export const CLOSING_MARK = "\\nClosing: yes";

/** 가짜 AI 가 받은 회화 턴 요청 수(끝맺음 호출은 뺀다 — talk-lesson · teacher-window · speech-feedback 가 함께 쓴다, e2e 분류 T6). */
export async function talkTurnRequests(): Promise<number> {
  return (await fakeAiRequests()).filter(
    (r) => r.bodyText.includes(TURN_MARK) && !r.bodyText.includes(CLOSING_MARK),
  ).length;
}

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
  lesson = talkLessonCard(level),
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

/**
 * 회화를 그 단계에서 시작한 집(앱 안 이름 Momo). 프로필 id. 회화 선생님은 기본 미나다 — 선생님이 없으면 처음 스냅숏 · 토리 행 1 을
 * 미루고 고르는 화면을 내므로(선생님 화면 plan 값 7) 고르는 화면 시험만 null 을 넘긴다.
 * e2e DB 의 시드 범위 끝(seed.complete_through_level)은 1 이라(dev-db --ephemeral 1단계 적재) 2단계부터는 집을 넣는 동안만 범위 끝을 마지막
 * 단계로 두고 되돌린다(lessons.ts atLevel 과 같은 꼴 — 집 넣기의 시작 단계 검사 start.ts trackStartsOf, e2e 첫 실행 묶음 A). 세션은
 * openTalkSession 이 바로 넣으므로 수업 시작 판정(범위 끝 검사)을 거치지 않는다.
 */
export async function talkHousehold(
  level: number,
  { teacherKey = "mina" }: { teacherKey?: string | null } = {},
): Promise<string> {
  const insert = async () => {
    const { profileId } = await insertHousehold({
      startLevels: { talk: level },
      teacherKey,
    });
    return profileId;
  };
  return level > LEVEL_MIN
    ? withHouseholdSetting("seed.complete_through_level", LEVEL_MAX, insert)
    : insert();
}

/** 짧은 준비를 필요할 때만 하는 방식(talk.prep_mode.<구간> 값 — 처음 짧은 준비 계획을 비움). */
const PREP_WHEN_NEEDED: TalkPrepMode = "when_needed";

/**
 * 그 프로필의 그 단계 구간 짧은 준비 방식을 when_needed 로 둔다(프로필 설정 행 talk.prep_mode.<구간> — 집 비우기로 함께 지워짐). 1~3단계는
 * always 라 카드 짧은 준비 낱말이 비어도 서버가 노리는 단어(필수 질문 · 더 이야기할 거리 targets)에서 준비 낱말을 골라 쪽지를 붙인다
 * (C33 — server/conversation/index.ts ensureLessonStarted · core/conversation/chances.ts startPrepWordsOf). 인사 → 대화 견본
 * (greetingTalkLesson)을 쓰는 시험이 인사 끝에서 바로 대화 첫 질문으로 가게 세션을 열기 전에 부른다(e2e 첫 실행 묶음 B).
 */
// 시험 전용 우회: 12절의 집 전체 키 talk.prep_mode.<구간> 을 프로필 행으로 덮는다(앱이 만들 수 없는 상태, getSettings 가 키 범위를 안 보는 데 기댐). 집 비우기로 함께 지워져 되돌림이 필요 없다. 범위 검사가 생기면 withHouseholdSetting 으로 바꾼다(검토 M-3).
export async function skipStartPrep(
  profileId: string,
  level: number,
): Promise<void> {
  const db = e2eDb();
  const [version] = await db
    .select({ v: max(settings.version) })
    .from(settings);
  await db.insert(settings).values({
    key: `talk.prep_mode.${bandOf(level)}`,
    scope: "profile",
    profileId,
    value: PREP_WHEN_NEEDED,
    version: Number(version?.v ?? 0) + 1,
  });
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
 * iPad WebKit(사파리 · 크롬) 꼴의 말소리 없는 듣기(10-22 실측 · C148): 시작 · 소리 받기 시작 뒤 결과 · 오류가 없고(스스로 no-speech 를 내지 않음),
 * 앱이 stop 하면 error aborted 'No speech detected' → end 로 끝난다. 아이가 말하지 않은 꼴이라 audiostart 는 마이크가 듣는 기기처럼 늦게
 * 둔다(speech.deaf_audiostart_ms 200 보다 빠르면 '마이크 안 잡힘'으로 끝나 셈에 들지 않는다 — 잠정 11-06, 분석 표 A 의 성공 듣기 278ms 이상).
 */
export function webkitSilentRun(): RecognitionRun {
  return {
    events: [
      { at: 50, type: "start" },
      { at: 400, type: "audiostart" },
    ],
    onStop: [
      {
        at: 10,
        type: "error",
        error: "aborted",
        message: "No speech detected",
      },
      { at: 20, type: "end" },
    ],
  };
}

/** '마이크 안 잡힘' 흉내의 audiostart(ms, start() 뒤 — speech.deaf_audiostart_ms 200 보다 빠르게, 분석 표 A 의 실패 듣기 꼴 · 시험 값). */
const DEAF_AUDIOSTART_AT_MS = 80;

/**
 * iPad WebKit '못 듣는 마이크' 꼴(13절 C210 · WebKit 326069 · 321436): start() 바로 뒤 audiostart 가 오고 그 뒤 소리 · 결과 · 오류가 없다.
 * 앱은 speech.deaf_silence_ms 뒤 '마이크 안 잡힘'(deaf)으로 끝내고 stop · abort 한다(가짜는 end 만 낸다). 감지는 speech.deaf_detect(시험값
 * ios)라 iPad 꼴 기기(playwright.config tablet-10-9-webkit)에서 켜진다.
 */
export function deafRun(): RecognitionRun {
  return {
    events: [
      { at: 50, type: "start" },
      { at: DEAF_AUDIOSTART_AT_MS, type: "audiostart" },
    ],
    onStop: [{ at: 10, type: "end" }],
    onAbort: [{ at: 10, type: "end" }],
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
 * 하루 안전 상한을 푼다(그 프로필의 호출 기록을 지움 — 같은 판정 함수 aiRestingToday 가 다시 읽으면 쉬지 않음, 묶음 0-가 writing.spec 과 같은 꼴).
 * 프로필 상한 설정 행(1)은 그대로라 그 뒤 호출 하나가 쌓이면 다시 쉰다 — 시험은 풀린 뒤 한 턴 · 한 수업만 본다.
 */
export async function liftSafetyCap(profileId: string): Promise<void> {
  await e2eDb().delete(aiCalls).where(eq(aiCalls.profileId, profileId));
}

/** 회화 턴 진행 창(서버 TURN_IN_FLIGHT_MS 60초, src/server/conversation/turn.ts)보다 넉넉히 앞(시험 값 — e2e 는 server-only 모듈을 못 가져온다). */
const PAST_IN_FLIGHT_MS = 5 * 60_000;

/**
 * 그 세션의 마지막 아이 행(토리 말이 없는 고아 행)의 기록 시각을 진행 창 너머로 물린다(묶음 0-마 · 0-가 검토 M4). 같은 시도 id 로 다시 보낼 때
 * 서버가 '아직 진행 중'(stale)으로 보지 않고 바로 부르게 한다 — 실제로는 그만큼 기다린 뒤의 다시 보냄과 같다. 앱 코드는 바꾸지 않는다.
 */
export async function pastTurnInFlight(sessionId: string): Promise<void> {
  const db = e2eDb();
  const [last] = await db
    .select({ id: talkTurns.id, at: talkTurns.recordedAt })
    .from(talkTurns)
    .where(
      and(eq(talkTurns.sessionId, sessionId), eq(talkTurns.speaker, "child")),
    )
    .orderBy(desc(talkTurns.turnNo))
    .limit(1);
  if (!last) throw new Error(`아이 행이 없다: ${sessionId}`);
  await db
    .update(talkTurns)
    .set({ recordedAt: new Date(last.at.getTime() - PAST_IN_FLIGHT_MS) })
    .where(eq(talkTurns.id, last.id));
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

// ── 새 꼴 카드 · 응답(회화 plan 묶음 11 — 네 토막: 인사 → 짧은 준비 → 대화 → 정리) ──

/** 새 꼴 견본 카드(talkCard — 1~3단계 배정 수업은 짧은 준비 낱말이 있고, 다지기는 kind 로). */
export function talkLessonCard(
  level: number,
  place: Partial<CellPlace> = {},
): TalkLesson {
  return talkCard(smallReferenceSet(), {
    level,
    unit: 1,
    kind: "assigned",
    lessonNo: 1,
    variant: 1,
    ...place,
  });
}

/**
 * 인사 → 대화 견본(새 꼴): 짧은 준비 낱말 · 새 단어 · 단원 단어 · 오늘 쓸 말을 비운다. 인사 · 필수 질문 · 더 이야기할 거리(노리는 단어 포함)는
 * 견본 그대로다. 카드만으로는 1~3단계 짧은 준비 토막이 없어지지 않는다 — talk.prep_mode.1-3 이 always 면 서버가 노리는 단어로 준비 쪽지를
 * 붙이므로(C33) 짧은 준비를 거치지 않는 대화 턴 시험(필수 경로 · 선생님 창 · 막힘)은 skipStartPrep 도 부른다(그러면 인사 끝 → 대화 첫 질문
 * — 카드 첫 필수 질문).
 */
export function greetingTalkLesson(
  level: number,
  place: Partial<CellPlace> = {},
): TalkLesson {
  const lesson = talkLessonCard(level, place);
  const { prep: _prep, ...card } = lesson.card;
  return {
    ...lesson,
    newWords: [],
    unitWords: [],
    card: { ...card, todayWords: [] },
  };
}

/** 새 꼴 회화 턴 응답 칸(빈 값 + 덮어쓴 칸, 6.2 규격 차례). */
export function talkLessonAnswer(
  over: Partial<TalkLessonOutput> = {},
): TalkLessonOutput {
  return {
    child_kind: over.stuck === true ? "not_understood" : "answer",
    stuck: false,
    tori_en: "Nice!",
    model_line: "",
    choices: [],
    tori_ko: ["좋아!"],
    recast: "",
    explanation: "",
    new_words: [],
    self_used_words: [],
    mission_done: [],
    response_fit: true,
    child_topic: false,
    child_asked: false,
    goal_suggest: [],
    next_move: "none",
    card_item: { kind: "none", no: 0 },
    next_goal: [],
    support: "none",
    next_targets: [],
    next_hint_ko: "",
    next_hints: [],
    next_usable_phrases: [],
    next_answer_example: "",
    image_word: "",
    farewell: "",
    farewell_ko: "",
    good_lines: [],
    next_time_lines: [],
    summary: "",
    ...over,
  };
}

/** 새 꼴 회화 턴 한 번(가짜 SSE — 조각 수 · 조각 사이 기다림 · 첫 조각 늦춤, 회화 턴 요청만 고름). */
export function talkLessonReply(
  over: Partial<TalkLessonOutput> = {},
  opts: {
    chunks?: number;
    delayMs?: number;
    firstDelayMs?: number;
    model?: string;
  } = {},
): FakeRule {
  const { chunks = 6, delayMs, firstDelayMs, model = TALK_MODEL_LOW } = opts;
  return {
    when: { bodyIncludes: TURN_MARK },
    reply: {
      kind: "stream",
      body: messageBody({ model, json: talkLessonAnswer(over) }),
      chunks,
      ...(delayMs === undefined ? {} : { delayMs }),
      ...(firstDelayMs === undefined ? {} : { firstDelayMs }),
    },
    times: 1,
  };
}

// ── 'AI 몫 넓힘' 묶음 5(장면 여는 질문 · 신호 말 · 상황 줄 — C206 · C207 · C209) ──

/**
 * 장면 여는 질문 칸을 뺀 견본(개정 4 꼴 카드 — 대화 첫 질문이 카드 첫 필수 질문이다, 'AI 몫 넓힘' plan 정한 것 3). 견본 빌더 talkCard 는 1~3단계
 * 카드에 칸을 둔다. 장면 여는 질문을 보지 않는 옛 시험(카드 필수 질문 자리의 힌트 · 받침 · 이어 하기 …)은 이 견본으로 그 길을 그대로 본다.
 */
export function withoutSceneOpener(lesson: TalkLesson): TalkLesson {
  const { sceneOpener: _opener, ...card } = lesson.card;
  return { ...lesson, card };
}

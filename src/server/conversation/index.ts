import "server-only";
// 회화 세션 서버(plan-p13b 파일별 값 1 — a '회화 수업 모델' 1 · 2 · 4 · 5, 3.3 '대화가 멈추는 경우' 표 · 5절 전이 · 8절 · C89 · C90 ·
// C95 · C100 · C101). 화면 자료(처음 열 때 처음 스냅숏 · 토리 행 1 — AI 없음) · 따라 말하기 저장 · 토막 넘김 · '더 이야기하기' ·
// '그만하기' · '홈' · 한 번 안내 기록 · 힌트 단 열기. 모두 그 프로필의 회화 세션만 다룬다(남의 세션은 거부). 시각은 now() 한 시계.
// AI 를 부르지 않는다(끝맺음 턴은 closing.ts 가 응답 뒤에, 회화 턴은 turn.ts). 아이 글을 로그에 내지 않는다.
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { toriRewriteOf } from "@/core/ai/calls/talk";
import type { PictureInfo } from "@/core/answer/display";
import {
  followAlongNo,
  parseTalkAttemptInput,
  TALK_START_ACTIVITY_NO,
  type TalkAttemptInput,
  talkStartAttemptId,
} from "@/core/conversation/attempt";
import {
  type AppendLine,
  appendAfter,
  nextUnusedQuestionNo,
  practiceItemsOf,
  practiceOrderOf,
  type TalkPosition,
  type TalkSegment,
  todayWordsOf,
} from "@/core/conversation/flow";
import { hintTiersOf } from "@/core/conversation/hints";
import {
  type TalkSpeechSettings,
  talkSpeechSettingsFrom,
} from "@/core/conversation/listen";
import { metWordsIn, talkEnglishSentenceDelta } from "@/core/conversation/said";
import {
  farewellOf,
  type WrapUpLine,
  wrapUpLinesOf,
} from "@/core/conversation/wrap-up";
import { TALK_SEGMENTS } from "@/core/seed/structure";
import {
  SPEECH_SETTING_KEYS,
  type SpeechSettings,
  speechSettingsFrom,
} from "@/core/speech/listen";
import { images, vocab } from "@/db/schema/content";
import { attempts, profiles, sessions, talkTurns } from "@/db/schema/learning";
import { type Db, type DbOrTx, getDb, type Tx } from "@/server/db";
import { dbErrorTag } from "@/server/db/safe-error";
import { readLessonList } from "@/server/lesson-list";
import { readHouseholdProfile } from "@/server/profile";
import { seedHomophones } from "@/server/seed-lists";
import { aiRestingToday } from "@/server/session/ai-gate";
import { getSettings, SettingMissingError } from "@/server/settings";
import {
  closeWithoutClosing,
  insertClosingRecord,
  scheduleTalkClosing,
} from "./closing";
import {
  type AddLine,
  addLinesOf,
  appendEnOf,
  appendLinesFromText,
  friendshipOf,
  isTalkOpen,
  knownSayOf,
  liveLites,
  metSayOf,
  nextOf,
  onTalkSessionEnded,
  positionWith,
  readTalkState,
  sentencesOf,
  snapshotNumber,
  type TalkServerDeps,
  type TalkState,
  type TurnNext,
  toriLinesOf,
  toriTextOf,
  writeSay,
} from "./state";

export {
  type ClosingStatus,
  closeIdleTalks,
  runTalkClosing,
  scheduleTalkClosing,
  talkClosingStatus,
} from "./closing";
export {
  type AddLine,
  type AddLineOut,
  type HintView,
  onTalkSessionEnded,
  type PendingView,
  reachTalkTarget,
  type TalkLine,
  type TalkServerDeps,
  type TurnNext,
} from "./state";

/** 시도 id 글자 수 상한(기술 값). */
export const CLIENT_ATTEMPT_ID_MAX = 100;
/** 아이 말 · 목표 글 글자 수 상한(기술 값 — 회화 한 턴 답보다 넉넉히). */
export const TALK_TEXT_MAX = 500;
/** 따라 말하기 한 차례의 인식 글 수 상한(기술 값 — speech.max_retries 보다 넉넉히). */
const HEARD_MAX = 10;
/** 한 차례 인식 실패 수 상한(기술 값). */
const FAILURES_MAX = 20;
/** 한 번 안내 열쇠(정할 것 회17 — profiles.notices_seen). */
export const TALK_NOTICE_KINDS = [
  "talk_intro",
  "talk_hint_nudge",
  "talk_test_hint_nudge",
] as const;

function logFailure(what: string, error: unknown) {
  if (error instanceof SettingMissingError)
    console.error(`${what} 실패(설정 ${error.key} 가 없습니다)`);
  else console.error(`${what} 실패(${dbErrorTag(error)})`);
}

const SessionIdSchema = z.strictObject({ sessionId: z.uuid() });

// ── 처음 열기(처음 스냅숏 · 토리 행 1 — C89, AI 없음) ───────────────

/** 오늘 쓸 말 단어의 뜻 · 예문(카드 오늘 쓸 말 먼저, 없으면 vocab). */
async function wordInfoOf(
  db: DbOrTx,
  state: Pick<TalkState, "card">,
  words: readonly string[],
): Promise<Map<string, { meaningKo: string; example: string }>> {
  const out = new Map<string, { meaningKo: string; example: string }>();
  for (const w of state.card.todayWords)
    out.set(w.word, { meaningKo: w.meaningKo, example: w.example });
  const missing = words.filter((w) => !out.has(w));
  if (missing.length > 0) {
    const rows = await db
      .select({
        word: vocab.word,
        meaning: vocab.meaning,
        example: vocab.example,
      })
      .from(vocab)
      .where(inArray(vocab.word, missing));
    for (const r of rows)
      out.set(r.word, { meaningKo: r.meaning, example: r.example ?? "" });
  }
  return out;
}

/** 카드의 그림 키(인사 질문 · 대화 턴 · 더 이야기할 거리). */
function imageKeysOf(card: TalkState["card"]): string[] {
  const turns = [
    ...("questions" in card.greeting ? card.greeting.questions : []),
    ...(card.turns ?? []),
    ...(card.moreTalk ?? []),
  ];
  return [
    ...new Set(
      turns.flatMap((t) => (t.imageKey === undefined ? [] : [t.imageKey])),
    ),
  ];
}

async function picturesOf(
  db: DbOrTx,
  card: TalkState["card"],
): Promise<Record<string, PictureInfo>> {
  const keys = imageKeysOf(card);
  if (keys.length === 0) return {};
  // 뜻 칸은 한국어 뜻(그 그림 낱말의 vocab 뜻)이거나 비움 — 그림 키 · 낱말(아이가 말할 영어)을 화면 자료로 내리지 않는다(화면 검토 I-2)
  const rows = await db
    .select({ key: images.key, path: images.path, meaning: vocab.meaning })
    .from(images)
    .leftJoin(vocab, eq(vocab.word, images.word))
    .where(inArray(images.key, keys));
  return Object.fromEntries(
    keys.map((key) => {
      const row = rows.find((r) => r.key === key);
      const path = row?.path ?? null;
      return [
        key,
        {
          meaningKo: row?.meaning ?? "",
          catalogued: path !== null,
          ...(path ? { src: path.startsWith("/") ? path : `/${path}` } : {}),
        },
      ];
    }),
  );
}

/** 토리 행 1(앱의 첫 말): 1~3단계 카드 인사 질문(1단계는 답 두 개도), 4단계부터 카드 토리 첫 말. */
function openingLinesOf(state: TalkState): AppendLine[] {
  const ko = state.spec.koMeaning;
  const greeting = state.card.greeting;
  if ("firstLine" in greeting)
    return [
      {
        kind: "question",
        en: greeting.firstLine.en,
        ...(ko && greeting.firstLine.ko !== undefined
          ? { ko: greeting.firstLine.ko }
          : {}),
      },
    ];
  const first = positionWith(state, [], "greeting").pending;
  if (!first?.en) return [];
  return [
    {
      kind: "question",
      en: first.en,
      ...(ko && first.ko ? { ko: first.ko } : {}),
    },
    ...(first.twoAnswers
      ? [{ kind: "two_answers" as const, answers: first.twoAnswers }]
      : []),
  ];
}

/** 처음 열 때(토리 행 · 처음 스냅숏이 없을 때) 한 트랜잭션 안에서 넣는다. 넣었으면 참. */
async function ensureStarted(
  tx: Tx,
  state: TalkState,
  at: Date,
): Promise<boolean> {
  let changed = false;
  if (!state.start) {
    const unitWords = state.lesson.unitWords;
    const metBefore = await metSayOf(tx, {
      profileId: state.profileId,
      words: unitWords,
    });
    const known = [
      ...(await knownSayOf(tx, {
        profileId: state.profileId,
        words: unitWords,
      })),
    ];
    const info = await wordInfoOf(tx, state, [
      ...unitWords,
      ...state.lesson.newWords,
    ]);
    const shown = todayWordsOf({
      card: state.card,
      lesson: { newWords: state.lesson.newWords, unitWords },
      metBefore,
      known,
      k: snapshotNumber(state, "unit.new_words_per_lesson"),
      vocab: (word) => info.get(word),
    }).map((p) => p.word);
    const items = practiceItemsOf({ spec: state.spec, card: state.card });
    const input: TalkAttemptInput = {
      v: 1,
      kind: "talk-start",
      step: "final",
      shownWords: shown,
      metBefore,
      practiceOrder: practiceOrderOf(
        state.session.id,
        items.length,
        state.practiceRounds,
      ),
    };
    if (!parseTalkAttemptInput(input))
      throw new Error("처음 스냅숏 꼴이 틀렸다");
    await tx
      .insert(attempts)
      .values({
        sessionId: state.session.id,
        clientAttemptId: talkStartAttemptId(state.session.id),
        activityNo: TALK_START_ACTIVITY_NO,
        input,
        attemptedAt: at,
        status: "done",
      })
      .onConflictDoNothing({ target: attempts.clientAttemptId });
    changed = true;
  }
  if (!state.rows.some((r) => r.speaker === "tori" && r.turnNo === 1)) {
    const lines = openingLinesOf(state);
    const appended = lines.map(appendEnOf);
    await tx.insert(talkTurns).values({
      sessionId: state.session.id,
      turnNo: 1,
      segment: "greeting",
      speaker: "tori",
      text: toriTextOf("", appended),
      toriRewrite: toriRewriteOf({ sentSentences: [], appended }),
      recordedAt: at,
    });
    changed = true;
  }
  return changed;
}

// ── 화면 자료 ────────────────────────────────────────────────────

export type TalkViewSettings = {
  speech: SpeechSettings;
  talkSpeech: TalkSpeechSettings;
  /** speech.max_retries */
  maxRetries: number;
  /** speech.silent_items_max — 말소리 없이 '모름'으로 넘어간 질문이 이만큼이면 막힌 안내(C22). */
  silentItemsMax: number;
  ui: {
    waitHintSeconds: [number, number];
    matchPhraseLevels: [number, number];
    autoNextSeconds: number;
  };
  talk: {
    confirmSeconds: number;
    hintReadMatch: number;
    dontknowMax: number;
    moreRoundTurns: number;
    nospeechDontknowCount: number;
    practiceRounds: number;
  };
  /** ai.timeout_seconds.feedback */
  feedbackTimeoutSeconds: number;
};

export type TalkView = {
  sessionId: string;
  /** 자료 판(턴 행 수 · 토막 · 끝 아이 행) — 쪽이 다시 읽으면(stale 뒤) 틀을 새로 그리는 열쇠. */
  version: string;
  level: number;
  unit: number;
  lessonNo: number;
  kind: string;
  retry: boolean;
  /** 오늘 이야기 제목(수업 행 list_title). */
  title: string;
  /** 토리가 부르는 이름({NAME} 을 화면이 채운다 — 영어 이름이 vocab 단어면 별명). */
  englishName: string;
  /** 카드의 화면 몫(아이가 말할 영어 문장은 넣지 않는다). */
  card: {
    topic: string;
    todayTopicsKo: string[];
  };
  spec: {
    segments: TalkSegment[];
    targetTurns: number;
    hintTiers: string[];
    cardShape: "turns" | "questions";
    koMeaning: boolean;
    twoAnswers: boolean;
    turnImages: boolean;
    moreTalk: boolean;
  };
  flow: TalkSegment[];
  position: Pick<
    TalkPosition,
    | "segment"
    | "talkCount"
    | "targetReached"
    | "awaitingChoice"
    | "moreRound"
    | "moreInRound"
    | "moreTurnsLeft"
    | "dontKnowCount"
    | "greetingDone"
    | "lastGreetingQuestion"
    | "childTurns"
  >;
  next: TurnNext;
  /** 이어 할 때 다시 그릴 마지막 토리 행(AI 호출 없음 — 회11 (9)). ko 는 1~3단계 토리 반응 뜻(C103 — 4단계부터 없음). */
  lastTori: { sentences: string[]; ko?: string; add: AddLine[] } | null;
  /** 토리의 말이 없는 마지막 아이 행 — 화면이 같은 시도 id 로 다시 보낸다(8절 · AC-15f). */
  retryTurn: {
    clientAttemptId: string;
    mode: "speech" | "dont_know";
    text: string | null;
  } | null;
  follow: {
    todayWords: { word: string; meaningKo: string; example: string }[];
    practice: {
      items: { word: string; example: string; exampleKo: string }[];
      order: number[][];
    };
    done: TalkState["follows"];
  };
  settings: TalkViewSettings;
  /** 1~3단계 그림 턴의 그림(카드 그림 키 → 카탈로그 그림 — 파일이 없으면 src 없음, 화면이 그리지 않는다). */
  pictures: Record<string, PictureInfo>;
  homophones: string[][];
  lemmaEntries: { word: string; forms: string[] }[];
  friendship: { value: number; max: number };
  /** 한 번 안내를 이미 보았는가(프로필마다 — 회17). */
  noticesSeen: Record<(typeof TALK_NOTICE_KINDS)[number], boolean>;
  /** 1-가 하루 안전 상한에 닿았고 목표 턴 전(화면이 '토리가 잠깐 쉬어요' — C80). */
  resting: boolean;
};

async function viewSettingsOf(
  db: DbOrTx,
  profileId: string,
): Promise<TalkViewSettings & { friendshipMax: number }> {
  const talkSpeechKeys = [
    "speech.end_silence_seconds.talk.1-3",
    "speech.end_silence_seconds.talk.4-6",
    "speech.end_silence_seconds.talk.7-9",
    "speech.end_silence_seconds.talk.10-12",
    "speech.end_silence_seconds.talk_long",
    "talk.max_answer_seconds",
    "speech.slow_rate",
  ];
  const positive = z.number().positive();
  const unit = z.number().min(0).max(1);
  const count = z.int().min(1);
  const values = await getSettings(
    {
      ...Object.fromEntries(
        [...SPEECH_SETTING_KEYS, ...talkSpeechKeys].map((key) => [
          key,
          z.unknown(),
        ]),
      ),
      "speech.max_retries": count,
      "speech.silent_items_max": count,
      "ui.wait_hint_seconds": z.tuple([positive, positive]),
      "ui.match_phrase_levels": z.tuple([unit, unit]),
      "ui.auto_next_seconds": z.number().nonnegative(),
      "ai.timeout_seconds.feedback": positive,
      "talk.confirm_seconds": z.number().nonnegative(),
      "talk.hint_read_match": unit,
      "talk.dontknow_max": count,
      "talk.more_talk_round_turns": count,
      "talk.nospeech_dontknow_count": count,
      "talk.practice_rounds": count,
      "talk.friendship_max": count,
    } as Record<string, z.ZodType>,
    { db, profileId },
  );
  const read = (key: string) => values[key];
  const num = (key: string) => values[key] as number;
  return {
    speech: speechSettingsFrom(read),
    talkSpeech: talkSpeechSettingsFrom(read),
    maxRetries: num("speech.max_retries"),
    silentItemsMax: num("speech.silent_items_max"),
    ui: {
      waitHintSeconds: values["ui.wait_hint_seconds"] as [number, number],
      matchPhraseLevels: values["ui.match_phrase_levels"] as [number, number],
      autoNextSeconds: num("ui.auto_next_seconds"),
    },
    talk: {
      confirmSeconds: num("talk.confirm_seconds"),
      hintReadMatch: num("talk.hint_read_match"),
      dontknowMax: num("talk.dontknow_max"),
      moreRoundTurns: num("talk.more_talk_round_turns"),
      nospeechDontknowCount: num("talk.nospeech_dontknow_count"),
      practiceRounds: num("talk.practice_rounds"),
    },
    feedbackTimeoutSeconds: num("ai.timeout_seconds.feedback"),
    friendshipMax: num("talk.friendship_max"),
  };
}

/** 지금 질문의 힌트 단(a hintTiersOf — 1~3단계 AI 자리는 토리 행에 실린 AI 질문 힌트, 4단계부터 이어 할 때는 카드 힌트). */
export function hintsOf(
  state: Pick<TalkState, "spec" | "card">,
  position: TalkPosition,
) {
  return hintTiersOf({
    spec: state.spec,
    card: state.card,
    pending: position.pending,
  });
}

/** 마지막 토리 행(이어 할 때 다시 그림). */
function lastToriOf(state: TalkState): TalkView["lastTori"] {
  const tori = state.liveRows.findLast((r) => r.speaker === "tori");
  if (!tori) return null;
  const { aiPart, appended } = toriLinesOf(tori.text);
  return {
    sentences: sentencesOf(aiPart),
    ...(tori.toriKo ? { ko: tori.toriKo } : {}),
    add: addLinesOf(
      appendLinesFromText(appended, {
        card: state.card,
        pending: state.position.pending,
        koMeaning: state.spec.koMeaning,
      }),
    ),
  };
}

/**
 * 회화 화면 자료(값 1). 그 프로필의 회화 세션이고 대화가 열려 있으면(진행 · 또는 완료이고 정리 토막 전) 자료, 아니면 undefined
 * (쪽이 회화 수업 목록으로). 처음 열 때 한 트랜잭션(세션 행 FOR UPDATE)으로 처음 스냅숏과 토리 행 1 을 넣는다(AI 없음).
 */
export async function loadTalkView(
  { sessionId }: { sessionId: string },
  deps: TalkServerDeps,
): Promise<TalkView | undefined> {
  if (!z.uuid().safeParse(sessionId).success) return undefined;
  const db: Db = deps.db ?? getDb();
  const profile = await readHouseholdProfile({ db });
  if (!profile) return undefined;
  const at = deps.now();
  const state = await db.transaction(async (tx) => {
    const first = await readTalkState(tx, {
      sessionId,
      profileId: profile.id,
      lock: true,
      at,
    });
    if (!first || !isTalkOpen(first.session)) return undefined;
    if (!(await ensureStarted(tx, first, at))) return first;
    return readTalkState(tx, { sessionId, profileId: profile.id, at });
  });
  if (!state) return undefined;
  const settings = await viewSettingsOf(db, profile.id);
  const { friendshipMax, ...viewSettings } = settings;
  const shown = state.start?.shownWords ?? [];
  const info = await wordInfoOf(db, state, shown);
  const seen = (profile.noticesSeen ?? {}) as Record<string, unknown>;
  const resting =
    !state.position.targetReached &&
    (await aiRestingToday({ profileId: profile.id, at }, { db }));
  const homophones = (deps.homophones ?? seedHomophones)();
  return {
    sessionId,
    version: `${state.rows.length}:${state.segment}:${state.orphan?.id ?? ""}`,
    level: state.level,
    unit: state.unit,
    lessonNo: state.lessonRow.lessonNo,
    kind: state.session.kind,
    retry: state.session.kind === "retry",
    title: state.lessonRow.listTitle,
    englishName: profile.toriNickname ?? profile.englishName,
    card: {
      topic: state.card.topic,
      todayTopicsKo: [...state.card.todayTopicsKo],
    },
    spec: {
      segments: [...state.spec.segments],
      targetTurns: state.spec.targetTurns,
      hintTiers: [...state.spec.hintTiers],
      cardShape: state.spec.cardShape,
      koMeaning: state.spec.koMeaning,
      twoAnswers: state.spec.twoAnswers,
      turnImages: state.spec.turnImages,
      moreTalk: state.spec.moreTalk,
    },
    flow: state.flow,
    position: {
      segment: state.position.segment,
      talkCount: state.position.talkCount,
      targetReached: state.position.targetReached,
      awaitingChoice: state.position.awaitingChoice,
      moreRound: state.position.moreRound,
      moreInRound: state.position.moreInRound,
      moreTurnsLeft: state.position.moreTurnsLeft,
      dontKnowCount: state.position.dontKnowCount,
      greetingDone: state.position.greetingDone,
      lastGreetingQuestion: state.position.lastGreetingQuestion,
      childTurns: state.position.childTurns,
    },
    next: nextOf(state.position, {
      spec: state.spec,
      hints: hintsOf(state, state.position),
    }),
    lastTori: lastToriOf(state),
    retryTurn: state.orphan?.clientAttemptId
      ? {
          clientAttemptId: state.orphan.clientAttemptId,
          mode: state.orphan.inputMode ?? "speech",
          text: state.orphan.text,
        }
      : null,
    follow: {
      todayWords: shown.map((word) => ({
        word,
        meaningKo: info.get(word)?.meaningKo ?? "",
        example: info.get(word)?.example ?? "",
      })),
      practice: {
        items: practiceItemsOf({ spec: state.spec, card: state.card }),
        order: state.start?.practiceOrder ?? [],
      },
      done: state.follows,
    },
    settings: viewSettings,
    pictures: await picturesOf(db, state.card),
    homophones,
    lemmaEntries: state.lemmaEntries,
    friendship: {
      value: await friendshipOf(db, profile.id),
      max: friendshipMax,
    },
    noticesSeen: Object.fromEntries(
      TALK_NOTICE_KINDS.map((kind) => [kind, typeof seen[kind] === "string"]),
    ) as TalkView["noticesSeen"],
    resting,
  };
}

/** 쪽이 고르는 데 쓰는 그 프로필 세션의 영역 · 상태(값 12). 회화면 대화가 열려 있는지도. */
export async function readTalkSessionArea(
  { sessionId }: { sessionId: string },
  { db = getDb() }: { db?: Db } = {},
): Promise<
  | { area: "talk"; status: string; open: boolean }
  | { area: "reading" | "writing" | "speaking"; status: string }
  | undefined
> {
  if (!z.uuid().safeParse(sessionId).success) return undefined;
  const profile = await readHouseholdProfile({ db });
  if (!profile) return undefined;
  const [row] = await db
    .select({
      area: sessions.area,
      status: sessions.status,
      talkSegment: sessions.talkSegment,
    })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.profileId, profile.id)));
  if (!row) return undefined;
  if (row.area === "talk")
    return { area: "talk", status: row.status, open: isTalkOpen(row) };
  return { area: row.area, status: row.status };
}

// ── 따라 말하기(오늘 쓸 말 · 말해 보기 · 정리 · 한 번 더 — AI 없음) ────

const FollowSchema = z.strictObject({
  sessionId: z.uuid(),
  clientAttemptId: z.string().min(1).max(CLIENT_ATTEMPT_ID_MAX),
  segment: z.enum(["today_words", "practice", "wrap_up", "again"]),
  index: z.int().min(0),
  round: z.int().min(0).optional(),
  target: z.string().max(TALK_TEXT_MAX),
  heard: z.array(z.string().max(TALK_TEXT_MAX)).max(HEARD_MAX),
  failures: z.int().min(0).max(FAILURES_MAX),
  skipped: z.enum(["recognition", "no_mic", "silent", "stalled"]).optional(),
});

export type FollowOutcome =
  | { ok: true; saved: boolean }
  | { ok: false; reason: "invalid" | "not_found" | "unavailable" };

/** 따라 말하기 시도의 종류 이름(a 시도 꼴). */
const FOLLOW_KIND = {
  today_words: "talk-today",
  practice: "talk-practice",
  wrap_up: "talk-wrapup",
  again: "talk-again",
} as const;

/** 되짚을 말(정리 토막 — a wrapUpLinesOf). */
export function wrapLinesOf(state: TalkState): WrapUpLine[] {
  return wrapUpLinesOf({
    recasts: state.rows.flatMap((r) =>
      r.speaker === "tori" && r.recast ? [r.recast] : [],
    ),
    todayWords: state.start?.shownWords ?? [],
    closingLines: state.card.closingLines,
    koMeaning: state.spec.koMeaning,
    lemmaOf: state.lemmaOf,
  });
}

/**
 * 따라 말하기 한 차례(값 1 saveFollowAlong): attempts 한 행(활동 번호 a followAlongNo · 같은 시도 id 는 한 번 · 점수 · 단어별 정오 없음)
 * + 영어로 말한 문장 수(인식 글이 있는 발화마다, C41). 따라 말하기는 '말했다'에 들지 않는다(3.4). 지금 토막보다 앞 토막만 받는다.
 */
export async function saveFollowAlong(
  raw: unknown,
  deps: TalkServerDeps,
): Promise<FollowOutcome> {
  const parsed = FollowSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const input = parsed.data;
  const db: Db = deps.db ?? getDb();
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false, reason: "not_found" };
    const at = deps.now();
    return await db.transaction(async (tx) => {
      const state = await readTalkState(tx, {
        sessionId: input.sessionId,
        profileId: profile.id,
        lock: true,
        at,
      });
      // 목표 턴 전 '그만하기'로 중단된 회화는 정리 토막이라 정리 따라 말하기를 받는다(검토 I-2). 다른 수업 고르기 ·
      // 시간 지남으로 중단된 회화(토막 그대로)는 거른다
      if (
        !state ||
        (state.session.status === "aborted" && state.segment !== "wrap_up")
      )
        return { ok: false, reason: "not_found" } as const;
      // 정리 · 한 번 더는 정리 토막에서만, 오늘 쓸 말 · 말해 보기는 그 토막에 들어선 뒤
      const order = TALK_SEGMENTS as readonly string[];
      const wanted = input.segment === "again" ? "wrap_up" : input.segment;
      const reached =
        input.segment === "wrap_up" || input.segment === "again"
          ? state.segment === "wrap_up"
          : order.indexOf(state.segment) >= order.indexOf(wanted);
      if (!reached) return { ok: false, reason: "invalid" } as const;
      let activityNo: number;
      try {
        activityNo = followAlongNo(
          {
            segment: input.segment,
            index: input.index,
            ...(input.round === undefined ? {} : { round: input.round }),
          },
          {
            todayWords: state.start?.shownWords.length ?? 0,
            practiceItems: practiceItemsOf({
              spec: state.spec,
              card: state.card,
            }).length,
            practiceRounds: state.practiceRounds,
            wrapUp: wrapLinesOf(state).length,
          },
        );
      } catch {
        return { ok: false, reason: "invalid" } as const;
      }
      const spoken = {
        target: input.target,
        heard: input.heard,
        failures: input.failures,
        ...(input.skipped ? { skipped: input.skipped } : {}),
      };
      const head = { v: 1 as const, step: "final" as const };
      const attemptInput: TalkAttemptInput =
        input.segment === "practice"
          ? {
              ...head,
              kind: "talk-practice",
              ...spoken,
              index: input.index,
              round: input.round ?? 0,
            }
          : input.segment === "again"
            ? { ...head, kind: "talk-again", ...spoken }
            : {
                ...head,
                kind: FOLLOW_KIND[input.segment],
                ...spoken,
                index: input.index,
              };
      if (!parseTalkAttemptInput(attemptInput))
        return { ok: false, reason: "invalid" } as const;
      const inserted = await tx
        .insert(attempts)
        .values({
          sessionId: state.session.id,
          clientAttemptId: input.clientAttemptId,
          activityNo,
          input: attemptInput,
          attemptedAt: at,
          status: "done",
        })
        .onConflictDoNothing({ target: attempts.clientAttemptId })
        .returning({ id: attempts.id });
      if (inserted.length === 0) return { ok: true, saved: false } as const;
      const delta = input.heard.reduce(
        (sum, text) =>
          sum +
          talkEnglishSentenceDelta(
            input.segment === "again" ? "again" : "follow",
            text,
          ),
        0,
      );
      if (delta > 0)
        await tx
          .update(sessions)
          .set({
            englishSentences: sql`${sessions.englishSentences} + ${delta}`,
          })
          .where(eq(sessions.id, state.session.id));
      return { ok: true, saved: true } as const;
    });
  } catch (error) {
    logFailure("회화 따라 말하기 저장", error);
    return { ok: false, reason: "unavailable" };
  }
}

// ── 토막 넘김 · 더 이야기하기 ─────────────────────────────────────

export type MoveOutcome =
  | { ok: true; segment: TalkSegment; add: AddLine[]; next: TurnNext }
  | {
      ok: false;
      reason: "invalid" | "not_found" | "out_of_order" | "unavailable";
    };

const AdvanceSchema = z.strictObject({
  sessionId: z.uuid(),
  to: z.enum(["today_words", "practice", "talk"]),
});

/** 토리 행 하나에 앱이 붙일 말을 더한다(원문 · 다시 쓸 토리 차례 — 다음 호출 전). */
async function appendToTori(
  tx: Tx,
  rowId: string,
  row: { text: string | null; toriRewrite: string | null },
  lines: readonly AppendLine[],
  extra: { cardQuestionNo?: number } = {},
): Promise<void> {
  const appended = lines.map(appendEnOf);
  const { aiPart, appended: before } = toriLinesOf(row.text);
  await tx
    .update(talkTurns)
    .set({
      text: toriTextOf(aiPart, [...before, ...appended]),
      ...(row.toriRewrite === null
        ? {}
        : {
            toriRewrite: [row.toriRewrite, ...appended]
              .filter((line) => line.trim() !== "")
              .join("\n"),
          }),
      ...(extra.cardQuestionNo === undefined
        ? {}
        : { cardQuestionNo: extra.cardQuestionNo }),
    })
    .where(eq(talkTurns.id, rowId));
}

function knownDaysOf(state: TalkState): number {
  return snapshotNumber(state, "talk.known_days");
}

/**
 * 토막 넘김(값 1 advanceTalk): a talkFlowOf 차례대로만(거꾸로 · 건너뛰기 거부). 인사에서 나가려면 인사 턴을 다 했어야 한다.
 * 오늘 쓸 말에 들어갈 때 그 단어 전부 만남(처음 스냅숏 뒤라 처음 · 다시 묻는 턴 판정에 닿지 않음), 대화에 들어갈 때 대화 첫 질문
 * (1~3단계 첫 대화 턴 질문 · 1단계 처음 묻는 턴이면 답 두 개, 4단계부터 카드 질문 1번 — AI 없음)을 인사 끝 토리 행에 붙이고
 * 그 질문의 단원 단어를 만남으로.
 */
export async function advanceTalk(
  raw: unknown,
  deps: TalkServerDeps,
): Promise<MoveOutcome> {
  const parsed = AdvanceSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const db: Db = deps.db ?? getDb();
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false, reason: "not_found" };
    const at = deps.now();
    return await db.transaction(async (tx) => {
      const state = await readTalkState(tx, {
        sessionId: parsed.data.sessionId,
        profileId: profile.id,
        lock: true,
        at,
      });
      if (!state || !isTalkOpen(state.session))
        return { ok: false, reason: "not_found" } as const;
      const to = parsed.data.to;
      const at0 = state.flow.indexOf(state.segment);
      if (at0 < 0 || state.flow[at0 + 1] !== to)
        return { ok: false, reason: "out_of_order" } as const;
      if (state.segment === "greeting" && !state.position.greetingDone)
        return { ok: false, reason: "out_of_order" } as const;
      const lastTori = state.liveRows.at(-1);
      if (lastTori?.speaker !== "tori" || state.orphan)
        return { ok: false, reason: "out_of_order" } as const;
      let lines: AppendLine[] = [];
      const met: string[] = [];
      if (to === "today_words") met.push(...(state.start?.shownWords ?? []));
      if (to === "talk") {
        const lites = liveLites(state);
        const inTalk = positionWith(state, lites, "talk");
        if (state.spec.cardShape === "turns")
          lines = appendAfter({
            spec: state.spec,
            card: state.card,
            after: inTalk,
            outcome: "ok",
            turnNo: lastTori.turnNo,
          });
        else {
          const q = state.card.questions?.[0];
          if (q)
            lines = [
              {
                kind: "question",
                en: q.en,
                ...(state.spec.koMeaning ? { ko: q.ko } : {}),
              },
            ];
        }
        await appendToTori(tx, lastTori.id, lastTori, lines);
        for (const line of lines)
          if (line.kind === "question")
            met.push(
              ...metWordsIn(line.en, {
                unitWords: state.lesson.unitWords,
                lemmaOf: state.lemmaOf,
              }),
            );
      }
      await tx
        .update(sessions)
        .set({ talkSegment: to })
        .where(eq(sessions.id, state.session.id));
      await writeSay(tx, {
        profileId: profile.id,
        met,
        said: [],
        day: state.learningDay,
        knownDays: knownDaysOf(state),
      });
      const after = await readTalkState(tx, {
        sessionId: state.session.id,
        profileId: profile.id,
        at,
      });
      if (!after) return { ok: false, reason: "not_found" } as const;
      return {
        ok: true,
        segment: to,
        add: addLinesOf(lines),
        next: nextOf(after.position, {
          spec: after.spec,
          hints: hintsOf(after, after.position),
        }),
      } as const;
    });
  } catch (error) {
    logFailure("회화 토막 넘김", error);
    return { ok: false, reason: "unavailable" };
  }
}

/** 4단계부터 '더 이야기하기'의 다음 카드 질문 — 아직 쓰지 않은 가장 앞, 다 썼으면 가장 적게 쓴 것(같으면 앞 번호). */
function moreQuestionNoOf(
  position: Pick<TalkPosition, "usedQuestionNos">,
  card: TalkState["card"],
): number | null {
  const unused = nextUnusedQuestionNo(position, card);
  if (unused !== null) return unused;
  const total = card.questions?.length ?? 0;
  if (total === 0) return null;
  let best = 1;
  const countOf = (no: number) =>
    position.usedQuestionNos.filter((n) => n === no).length;
  for (let no = 2; no <= total; no++)
    if (countOf(no) < countOf(best)) best = no;
  return best;
}

/**
 * '더 이야기하기'(값 1 chooseMoreTalk, C30): 목표 턴 뒤 고를 차례(완료 세션)에서만. talk_segment more_talk, 고르기 차례의 토리 행에
 * 다음 질문을 붙인다 — 1~3단계는 흐름의 다음 질문('더 이야기할 거리' · AI 자리면 가장 오래전에 쓴 것), 4단계부터 아직 쓰지 않은 가장 앞
 * 카드 질문(그 번호를 카드 질문 번호로). 그 행이 '골랐음'이 된다(a '요청 2' moreChosen).
 */
export async function chooseMoreTalk(
  raw: unknown,
  deps: TalkServerDeps,
): Promise<MoveOutcome> {
  const parsed = SessionIdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const db: Db = deps.db ?? getDb();
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false, reason: "not_found" };
    const at = deps.now();
    return await db.transaction(async (tx) => {
      const state = await readTalkState(tx, {
        sessionId: parsed.data.sessionId,
        profileId: profile.id,
        lock: true,
        at,
      });
      if (!state || !isTalkOpen(state.session))
        return { ok: false, reason: "not_found" } as const;
      const lastTori = state.liveRows.at(-1);
      if (
        state.session.status !== "completed" ||
        !state.position.awaitingChoice ||
        lastTori?.speaker !== "tori"
      )
        return { ok: false, reason: "out_of_order" } as const;
      const lites = liveLites(state);
      const last = lites.at(-1);
      if (last?.speaker === "tori")
        lites[lites.length - 1] = { ...last, moreChosen: true };
      const chosen = positionWith(state, lites, "more_talk");
      let lines: AppendLine[] = [];
      let cardQuestionNo: number | undefined;
      if (state.spec.cardShape === "turns")
        lines = appendAfter({
          spec: state.spec,
          card: state.card,
          after: chosen,
          outcome: "ok",
          turnNo: lastTori.turnNo,
        });
      else {
        const no = moreQuestionNoOf(chosen, state.card);
        const q = no === null ? undefined : state.card.questions?.[no - 1];
        if (q && no !== null) {
          cardQuestionNo = no;
          lines = [
            {
              kind: "question",
              en: q.en,
              ...(state.spec.koMeaning ? { ko: q.ko } : {}),
            },
          ];
        }
      }
      if (lines.length === 0)
        return { ok: false, reason: "out_of_order" } as const;
      await appendToTori(tx, lastTori.id, lastTori, lines, {
        ...(cardQuestionNo === undefined ? {} : { cardQuestionNo }),
      });
      await tx
        .update(sessions)
        .set({ talkSegment: "more_talk" })
        .where(eq(sessions.id, state.session.id));
      await writeSay(tx, {
        profileId: profile.id,
        met: lines.flatMap((line) =>
          line.kind === "question"
            ? metWordsIn(line.en, {
                unitWords: state.lesson.unitWords,
                lemmaOf: state.lemmaOf,
              })
            : [],
        ),
        said: [],
        day: state.learningDay,
        knownDays: knownDaysOf(state),
      });
      const after = await readTalkState(tx, {
        sessionId: state.session.id,
        profileId: profile.id,
        at,
      });
      if (!after) return { ok: false, reason: "not_found" } as const;
      return {
        ok: true,
        segment: "more_talk",
        add: addLinesOf(lines),
        next: nextOf(after.position, {
          spec: after.spec,
          hints: hintsOf(after, after.position),
        }),
      } as const;
    });
  } catch (error) {
    logFailure("회화 더 이야기하기", error);
    return { ok: false, reason: "unavailable" };
  }
}

// ── 그만하기 · 홈(3.3 '대화가 멈추는 경우' · C33 · C34 · AC-8c · AC-15f) ──

/** 마무리 자료(값 15 — 첫 장 · 셋째 장, 둘째 장 4단계부터 몫은 c). */
export type WrapView = {
  /** 되짚을 말(정리 토막 — 1~3단계는 문장마다 따라 말하기). */
  lines: WrapUpLine[];
  /** 카드 끝인사(끝맺음 끝인사가 와 있으면 화면이 talkClosingStatus 로 바꾼다 — C33). */
  farewell: { en: string; ko?: string };
  /** 목표 턴 전 그만둔 대화('다음에 끝까지 이야기하면 별을 받아요'). */
  aborted: boolean;
  retry: boolean;
  /** 오늘 얻은 단어(이 세션 오늘 쓸 말 단어 — 대화에 원형이 안 나온 것에 듣기 단추, 회11 (12)). */
  gotWords: {
    word: string;
    meaningKo: string;
    example: string;
    inTalk: boolean;
  }[];
  /** 친한 정도 막대(다시 하기는 없음). */
  friendship: { value: number; max: number } | null;
  /** 다음 이야기(수업 목록 '여기부터 해요'의 회화 수업). 없으면 null. */
  nextLesson: { lessonId: string; title: string } | null;
};

async function nextTalkLessonOf(
  db: Db,
  at: Date,
): Promise<WrapView["nextLesson"]> {
  const list = await readLessonList({ db, area: "talk", now: at });
  if (list.kind !== "list") return null;
  const here = list.view.hereStart;
  if (here?.kind !== "lesson") return null;
  const items = [
    ...(list.view.current?.front ?? []),
    ...(list.view.current?.back ?? []),
  ];
  const item = items.find(
    (i) =>
      i.ref.unit === here.ref.unit &&
      i.ref.kind === here.ref.kind &&
      i.ref.lessonNo === here.ref.lessonNo,
  );
  return item ? { lessonId: item.lessonId, title: item.title } : null;
}

async function wrapViewOf(
  db: Db,
  state: TalkState,
  { aborted, at }: { aborted: boolean; at: Date },
): Promise<WrapView> {
  const shown = state.start?.shownWords ?? [];
  const info = await wordInfoOf(db, state, shown);
  const talkText = state.rows
    .filter((r) => r.segment !== "wrap_up")
    .map((r) => r.text ?? "")
    .join("\n");
  const inTalk = new Set(
    metWordsIn(talkText, { unitWords: shown, lemmaOf: state.lemmaOf }),
  );
  const farewell = farewellOf({
    closing: null,
    card: state.card,
    koMeaning: state.spec.koMeaning,
  });
  const retry = state.session.kind === "retry";
  const settings = await viewSettingsOf(db, state.profileId);
  return {
    lines: wrapLinesOf(state),
    farewell: {
      en: farewell.en,
      ...(farewell.ko === undefined ? {} : { ko: farewell.ko }),
    },
    aborted,
    retry,
    gotWords: shown.map((word) => ({
      word,
      meaningKo: info.get(word)?.meaningKo ?? "",
      example: info.get(word)?.example ?? "",
      inTalk: inTalk.has(word),
    })),
    friendship: retry
      ? null
      : {
          value: await friendshipOf(db, state.profileId),
          max: settings.friendshipMax,
        },
    nextLesson: await nextTalkLessonOf(db, at),
  };
}

const StopSchema = z.strictObject({
  sessionId: z.uuid(),
  confirmed: z.boolean(),
});

export type StopOutcome =
  | { ok: true; wrap: WrapView }
  | {
      ok: false;
      reason: "invalid" | "not_found" | "needs_confirm" | "unavailable";
    };

/**
 * 대화를 닫는다(정리 토막 — '대화 닫힘'). 끝맺음: 1-가 하루 안전 상한이면 목표 턴 전은 없음(건너뜀 · 보낸 메시지 지움), 목표 턴 뒤는
 * 미룸(대기 기록만 — 풀린 학습일의 첫 홈 진입). 그 밖은 대기 기록 + 응답 뒤(scheduled 참).
 */
async function closeTalk(
  tx: Tx,
  state: TalkState,
  {
    at,
    reason,
    resting,
  }: { at: Date; reason: "stop" | "leave"; resting: boolean },
): Promise<{ schedule: boolean; aborted: boolean }> {
  const aborted = !state.position.targetReached;
  await tx
    .update(sessions)
    .set({
      talkSegment: "wrap_up",
      ...(aborted
        ? { status: "aborted" as const, learningDay: state.learningDay }
        : {}),
    })
    .where(eq(sessions.id, state.session.id));
  if (aborted)
    await onTalkSessionEnded(tx, {
      sessionId: state.session.id,
      profileId: state.profileId,
      ended: "aborted",
    });
  if (resting && aborted) {
    await closeWithoutClosing(tx, {
      sessionId: state.session.id,
      at,
      reason,
    });
    return { schedule: false, aborted };
  }
  await insertClosingRecord(tx, { sessionId: state.session.id, at, reason });
  return { schedule: !resting, aborted };
}

/**
 * '그만하기'(값 1 stopTalk): 목표 턴 전이면 확인(C34 쪽지)이 있어야 하고 중단 + 학습일 + 정리 토막, 목표 턴 뒤면 정리 토막만.
 * 끝맺음 턴은 응답 뒤(AC-8c — 응답은 끝맺음을 기다리지 않는다). 정리 자료(되짚을 말 · 카드 끝인사, C33)와 마무리 자료를 돌려준다.
 */
export async function stopTalk(
  raw: unknown,
  deps: TalkServerDeps,
): Promise<StopOutcome> {
  const parsed = StopSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const db: Db = deps.db ?? getDb();
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false, reason: "not_found" };
    const at = deps.now();
    const resting = await aiRestingToday({ profileId: profile.id, at }, { db });
    const done = await db.transaction(async (tx) => {
      const state = await readTalkState(tx, {
        sessionId: parsed.data.sessionId,
        profileId: profile.id,
        lock: true,
        at,
      });
      if (!state || !isTalkOpen(state.session))
        return { ok: false, reason: "not_found" } as const;
      if (!state.position.targetReached && !parsed.data.confirmed)
        return { ok: false, reason: "needs_confirm" } as const;
      const closed = await closeTalk(tx, state, {
        at,
        reason: "stop",
        resting,
      });
      return { ok: true, state, ...closed } as const;
    });
    if (!done.ok) return done;
    if (done.schedule) scheduleTalkClosing(done.state.session.id, deps);
    return {
      ok: true,
      wrap: await wrapViewOf(db, done.state, { aborted: done.aborted, at }),
    };
  } catch (error) {
    logFailure("회화 그만하기", error);
    return { ok: false, reason: "unavailable" };
  }
}

export type LeaveOutcome =
  | { ok: true; closed: false }
  | { ok: true; closed: true; wrap: WrapView | null }
  | { ok: false; reason: "invalid" | "not_found" | "unavailable" };

/**
 * '홈'(값 1 leaveTalk): 목표 턴 전이면 아무것도 바꾸지 않는다(진행 — C34, 다시 열면 토리의 마지막 질문부터). 목표 턴 뒤면 정리
 * 토막으로 닫고 끝맺음을 응답 뒤로(a 정할 것 회11 (10)) · 마무리 첫 장 자료. 이미 닫혔으면 그대로.
 */
export async function leaveTalk(
  raw: unknown,
  deps: TalkServerDeps,
): Promise<LeaveOutcome> {
  const parsed = SessionIdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const db: Db = deps.db ?? getDb();
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false, reason: "not_found" };
    const at = deps.now();
    const resting = await aiRestingToday({ profileId: profile.id, at }, { db });
    const done = await db.transaction(async (tx) => {
      const state = await readTalkState(tx, {
        sessionId: parsed.data.sessionId,
        profileId: profile.id,
        lock: true,
        at,
      });
      if (!state) return { ok: false, reason: "not_found" } as const;
      if (!isTalkOpen(state.session))
        return { ok: true, closed: true, state: null } as const;
      if (!state.position.targetReached)
        return { ok: true, closed: false } as const;
      const closed = await closeTalk(tx, state, {
        at,
        reason: "leave",
        resting,
      });
      return { ok: true, closed: true, state, ...closed } as const;
    });
    if (!done.ok) return done;
    if (!done.closed) return { ok: true, closed: false };
    if (!done.state) return { ok: true, closed: true, wrap: null };
    if (done.schedule) scheduleTalkClosing(done.state.session.id, deps);
    return {
      ok: true,
      closed: true,
      wrap: await wrapViewOf(db, done.state, { aborted: false, at }),
    };
  } catch (error) {
    logFailure("회화 홈", error);
    return { ok: false, reason: "unavailable" };
  }
}

// ── 한 번 안내 · 힌트 단 ──────────────────────────────────────────

const NoticeSchema = z.strictObject({ kind: z.enum(TALK_NOTICE_KINDS) });

/** 한 번 안내를 보았다(profiles.notices_seen[kind] = 지금 — 프로필마다 한 번이라 다른 기기에서도 안 보임, 회17 · AC-15l). */
export async function markTalkNotice(
  raw: unknown,
  deps: Pick<TalkServerDeps, "db" | "now">,
): Promise<{ ok: boolean }> {
  const parsed = NoticeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false };
  const db = deps.db ?? getDb();
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false };
    await db
      .update(profiles)
      .set({
        noticesSeen: sql`jsonb_set(coalesce(${profiles.noticesSeen}, '{}'::jsonb), ${`{${parsed.data.kind}}`}::text[], to_jsonb(${deps.now().toISOString()}::text))`,
      })
      .where(eq(profiles.id, profile.id));
    return { ok: true };
  } catch (error) {
    logFailure("회화 안내 기록", error);
    return { ok: false };
  }
}

const RevealSchema = z.strictObject({
  sessionId: z.uuid(),
  tier: z.int().min(0),
});

/**
 * 1~3단계 힌트 단 하나의 글(아이가 '힌트'를 눌러 연 단만 — 영어 문장을 미리 내려 주지 않는다, 3.3 · CLAUDE.md). 지금 질문의 단이 없으면
 * ok 거짓.
 */
export async function revealTalkHint(
  raw: unknown,
  deps: Pick<TalkServerDeps, "db" | "now">,
): Promise<{ ok: true; text: string } | { ok: false }> {
  const parsed = RevealSchema.safeParse(raw);
  if (!parsed.success) return { ok: false };
  const db = deps.db ?? getDb();
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false };
    const state = await readTalkState(db, {
      sessionId: parsed.data.sessionId,
      profileId: profile.id,
      at: deps.now(),
    });
    if (!state || !isTalkOpen(state.session)) return { ok: false };
    const tier = hintsOf(state, state.position)[parsed.data.tier];
    return tier ? { ok: true, text: tier.text } : { ok: false };
  } catch (error) {
    logFailure("회화 힌트", error);
    return { ok: false };
  }
}

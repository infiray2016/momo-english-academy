import "server-only";
// 배치 평가 서버(3.2 배치 평가 표 · 4절 배치 평가 행 · 5절 level_tests · sessions · attempts · 8절 네트워크 · 오래 멈춘 세션,
// plan-p10a 파일별 값 12 · 정할 것 처 · 타 · 파 · 퍼). 시작 · 이어 보기 · 답 저장 · 결과를 한 곳에 둔다.
// 상태는 level_tests.answers(답 기록)뿐이고 다음 차례는 순수 함수 nextPlacementStep 이 다시 센다(AC-11d).
// 채점은 서버가 checkAnswer 로 한다(따라 말하기는 화면이 보낸 인식 글로 다시 셈). AI 를 부르지 않는다.
// 시각은 인자(now)로 받고 질의 SQL 안에 now() 를 쓰지 않는다. DB 오류는 이름 · 코드만 로그에 남긴다(답 글 · 인식 글을 내지 않음).
import { and, eq, inArray, max } from "drizzle-orm";
import { z } from "zod";
import {
  type Answer,
  type CheckItem,
  type CheckOptions,
  checkAnswer,
} from "@/core/answer/check";
import {
  type DisplayItem,
  displayItemOf,
  type PictureInfo,
} from "@/core/answer/display";
import { learningDayOf } from "@/core/learning-day";
import {
  nextPlacementStep,
  type PlacementStep,
  slotKey,
} from "@/core/placement/adaptive";
import { placementFinishOf } from "@/core/placement/finish";
import {
  firstRunSettingKeys,
  MIC_BROWSER_MAX,
  MIC_CODE_MAX,
  PLACEMENT_KEYS,
  placementSnapshotOf,
} from "@/core/profile/start";
import {
  type PlacementItem,
  ReadingPlacementItemSchema,
  SpeakingPlacementItemSchema,
  WritingPlacementItemSchema,
} from "@/core/seed/schema/assessment";
import { LEVEL_MAX, type PlacementArea } from "@/core/seed/structure";
import {
  SPEECH_SETTING_KEYS,
  type SpeechSettings,
  speechSettingsFrom,
} from "@/core/speech/listen";
import { images, vocab } from "@/db/schema/content";
import {
  attempts,
  levelTests,
  profileTracks,
  sessions,
  unitProgress,
} from "@/db/schema/learning";
import { parentAlerts, progressEvents, settings } from "@/db/schema/operations";
import { createAlertOnce } from "@/server/ai/store";
import { type Db, getDb } from "@/server/db";
import { dbErrorTag } from "@/server/db/safe-error";
import { readHouseholdProfile } from "@/server/profile";
import {
  currentSeedRevision,
  type PlacementItemRow,
  readPlacementForm,
} from "@/server/seed/read";
import { loadSeedList, SeedListError } from "@/server/seed-lists";
import { getSettings, SettingMissingError } from "@/server/settings";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** 1차 배치 평가는 가 벌 한 벌(3.2 — 둘째 벌은 2차). */
const PLACEMENT_FORM = 1;
/** 배치 평가 회차(1차는 첫 배치뿐 — 재배치는 2차). */
const PLACEMENT_ROUND = 1;
const ITEMS_PER_AREA_KEY = "placement.items_per_area";
const MAX_RETRIES_KEY = "speech.max_retries";
const THROUGH_KEY = "seed.complete_through_level";
const TIMEZONE_KEY = "app.timezone";
const DAY_START_KEY = "app.day_start_hour";
/** Postgres 유일 제약 위반(두 기기가 함께 시작). */
const UNIQUE_VIOLATION = "23505";

// 답 입력 상한(기술 값 — 화면이 보낼 수 있는 꼴보다 넉넉하게)
/** 보기 번호 상한. */
const CHOICE_NO_MAX = 12;
/** 타일 · 카드 수 상한과 한 조각 글자 수 상한. */
const PIECES_MAX = 40;
const PIECE_LENGTH_MAX = 40;
/** 쓴 답 · 인식 글 한 줄 글자 수 상한. */
const TEXT_LENGTH_MAX = 400;

const AnswerSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("choice"),
    no: z.int().min(1).max(CHOICE_NO_MAX),
  }),
  z.strictObject({
    kind: z.literal("tiles"),
    pieces: z.array(z.string().max(PIECE_LENGTH_MAX)).max(PIECES_MAX),
  }),
  z.strictObject({
    kind: z.literal("text"),
    text: z.string().max(TEXT_LENGTH_MAX),
  }),
  z.strictObject({
    kind: z.literal("repeat"),
    heard: z.array(z.string().max(TEXT_LENGTH_MAX)).min(1),
  }),
  z.strictObject({ kind: z.literal("repeat-failed") }),
  z.strictObject({ kind: z.literal("dont-know") }),
]);

const AnswerInputSchema = z.strictObject({
  sessionId: z.uuid(),
  clientAttemptId: z.uuid(),
  itemId: z.uuid(),
  answer: AnswerSchema,
});

const MicAlertSchema = z.strictObject({
  kind: z.enum(["mic_unavailable", "mic_stalled"]),
  code: z.string().min(1).max(MIC_CODE_MAX),
  browser: z.string().max(MIC_BROWSER_MAX),
});

/** level_tests.answers 한 줄(채점 칸 + 낸 문항 id). */
const StoredAnswerSchema = z.object({
  itemId: z.string(),
  level: z.int(),
  slot: z.enum(["main", "spare"]),
  no: z.int(),
  correct: z.boolean(),
  dontKnow: z.boolean(),
  repeatFailed: z.boolean(),
});
type StoredAnswer = z.infer<typeof StoredAnswerSchema>;

const ITEM_SCHEMA = {
  reading: ReadingPlacementItemSchema,
  writing: WritingPlacementItemSchema,
  speaking: SpeakingPlacementItemSchema,
} as const;

// ── 화면에 넘기는 꼴 ──

export type PlacementScreen =
  | { kind: "ready"; maxItems: number }
  | {
      kind: "item";
      sessionId: string;
      itemId: string;
      /** 화면 위 '문제 n'. */
      itemNo: number;
      level: number;
      item: DisplayItem;
      /** 따라 말하기 문항의 기준 · 시도 수(배치 복사본). */
      repeat?: { pass: number; tries: number };
    }
  | {
      kind: "done";
      area: PlacementArea;
      start: number;
      alphabet: boolean;
      usedSpares: boolean;
    };

/** 화면이 쓰는 음성 설정(말하기 배치). */
export type PlacementConfig = {
  speech: SpeechSettings;
  maxRetries: number;
  homophones: string[][];
};

export type PlacementPage =
  | { kind: "no_profile" }
  | { kind: "placed" }
  | { kind: "screen"; screen: PlacementScreen; config: PlacementConfig };

export type PlacementOutcome =
  | { ok: true; screen: PlacementScreen }
  | {
      ok: false;
      reason:
        | "invalid"
        | "stale"
        | "not_pending"
        | "no_profile"
        | "unavailable";
    };

export type PlacementDeps = {
  db?: Db;
  now: () => Date;
  /** 동음이의어 묶음(시드 lists/homophones.json). 시험이 바꾼다. */
  homophones?: () => string[][];
};

// ── 읽기 ──

async function settingValues(
  db: Db,
  keys: readonly string[],
): Promise<Record<string, unknown>> {
  return getSettings(Object.fromEntries(keys.map((k) => [k, z.unknown()])), {
    db,
  });
}

function numberSetting(values: Record<string, unknown>, key: string): number {
  const value = values[key];
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new SettingMissingError(key);
  return value;
}

/** 목록 없음 알림을 한 번만 냈는가(서버 인스턴스마다). */
let homophonesMissingWarned = false;

/**
 * 동음이의어 묶음(정할 것 타 — P9c 의 loadSeedList). 시드 목록 파일이 없는 개발용 · e2e 길(시험용 시드는 DB 에만 있음)에서는
 * 빈 묶음으로 본다 — 일치율이 조금 엄해질 뿐 판정은 된다. 운영에서 빌드 추적이 빠져 없을 때 조용히 엄해지지 않게
 * 처음 한 번 경고를 남긴다(이름만, 검토 review-p10-5-6-code M-3). 규격이 틀린 파일은 던진다.
 */
export function seedHomophones(): string[][] {
  try {
    return loadSeedList("homophones").groups;
  } catch (error) {
    if (error instanceof SeedListError && error.reason === "missing") {
      if (!homophonesMissingWarned) {
        homophonesMissingWarned = true;
        console.warn(
          "동음이의어 목록(seed/lists/homophones.json)이 없어 빈 묶음으로 채점합니다",
        );
      }
      return [];
    }
    throw error;
  }
}

async function trackOf(
  db: Db | Tx,
  profileId: string,
  area: PlacementArea | "talk",
) {
  const [track] = await db
    .select()
    .from(profileTracks)
    .where(
      and(eq(profileTracks.profileId, profileId), eq(profileTracks.area, area)),
    );
  return track;
}

async function openPlacement(db: Db, profileId: string, area: PlacementArea) {
  const [row] = await db
    .select({ session: sessions, test: levelTests })
    .from(sessions)
    .innerJoin(levelTests, eq(levelTests.id, sessions.levelTestId))
    .where(
      and(
        eq(sessions.profileId, profileId),
        eq(sessions.area, area),
        eq(sessions.kind, "placement"),
        eq(sessions.status, "in_progress"),
      ),
    );
  return row;
}

type FormEntry = { row: PlacementItemRow; item: PlacementItem };
type Form = Map<string, FormEntry>;

const formKey = (level: number, slot: "main" | "spare", no: number) =>
  `${level}:${slot}:${no}`;

async function readForm(
  db: Db,
  area: PlacementArea,
  startRevision: number,
): Promise<Form> {
  const rows = await readPlacementForm(
    { area, form: PLACEMENT_FORM, startRevision },
    { db },
  );
  const form: Form = new Map();
  for (const row of rows) {
    const parsed = ITEM_SCHEMA[area].safeParse(row.item);
    if (!parsed.success)
      throw new Error(`배치 문항 규격이 맞지 않는다: ${row.id}`);
    form.set(formKey(row.level, row.isSpare ? "spare" : "main", row.itemNo), {
      row,
      item: parsed.data,
    });
  }
  return form;
}

function repeatSlotsOf(form: Form): Set<string> {
  const out = new Set<string>();
  for (const { row } of form.values()) {
    if (!row.isSpare && row.itemType === "repeat")
      out.add(slotKey(row.level, row.itemNo));
  }
  return out;
}

function storedAnswers(raw: unknown): StoredAnswer[] {
  return z.array(StoredAnswerSchema).parse(raw ?? []);
}

function stepOf(
  test: typeof levelTests.$inferSelect,
  form: Form,
  through: number,
): PlacementStep {
  const snapshot = test.settingsSnapshot as Record<string, unknown>;
  return nextPlacementStep({
    startLevel: numberSetting(snapshot, "placement.start_level"),
    perLevel: numberSetting(snapshot, "placement.items_per_level"),
    maxItems: numberSetting(snapshot, ITEMS_PER_AREA_KEY),
    levelMax: LEVEL_MAX,
    through,
    answers: storedAnswers(test.answers),
    repeatSlots: repeatSlotsOf(form),
  });
}

/** 문항에 쓰인 낱말의 그림 정보(정할 것 파 — 카탈로그 행을 믿고 경로를 준다. 읽기 실패는 화면이 뜻 글로). */
async function pictureLookup(
  db: Db,
  item: PlacementItem,
): Promise<(word: string) => PictureInfo> {
  const words = new Set<string>();
  if (item.type === "picture") for (const w of item.options) words.add(w);
  if (item.type === "listening" && item.kind === "picture")
    for (const w of item.options) words.add(w);
  if (item.type === "pick-word") words.add(item.picture);
  if (item.type === "fill-letters") words.add(item.word);
  const found = new Map<string, PictureInfo>();
  if (words.size > 0) {
    const rows = await db
      .select({ word: vocab.word, meaning: vocab.meaning, path: images.path })
      .from(vocab)
      .leftJoin(images, eq(images.key, vocab.imageKey))
      .where(inArray(vocab.word, [...words]));
    for (const row of rows) {
      found.set(row.word, {
        meaningKo: row.meaning,
        catalogued: row.path !== null,
        ...(row.path
          ? { src: row.path.startsWith("/") ? row.path : `/${row.path}` }
          : {}),
      });
    }
  }
  return (word) => found.get(word) ?? { meaningKo: word, catalogued: false };
}

async function screenOf(
  db: Db,
  area: PlacementArea,
  session: typeof sessions.$inferSelect,
  test: typeof levelTests.$inferSelect,
  form: Form,
  through: number,
): Promise<PlacementScreen> {
  const step = stepOf(test, form, through);
  if (step.kind === "done") {
    return {
      kind: "done",
      area,
      start: test.placementStartLevel ?? step.result.start,
      alphabet: step.result.alphabet,
      usedSpares: step.result.usedSpares,
    };
  }
  const entry = form.get(formKey(step.level, step.slot, step.no));
  if (!entry)
    throw new Error(
      `배치 문항 칸이 없다: ${area} ${step.level}:${step.slot}:${step.no}`,
    );
  const snapshot = test.settingsSnapshot as Record<string, unknown>;
  const item = displayItemOf(entry.item, await pictureLookup(db, entry.item));
  return {
    kind: "item",
    sessionId: session.id,
    itemId: entry.row.id,
    itemNo: step.itemNo,
    level: step.level,
    item,
    ...(entry.item.type === "repeat"
      ? {
          repeat: {
            pass: numberSetting(snapshot, "placement.repeat_pass"),
            tries: numberSetting(snapshot, "placement.repeat_tries"),
          },
        }
      : {}),
  };
}

async function configOf(db: Db, area: PlacementArea): Promise<PlacementConfig> {
  const values = await settingValues(db, [
    ...SPEECH_SETTING_KEYS,
    MAX_RETRIES_KEY,
  ]);
  return {
    speech: speechSettingsFrom((key) => values[key]),
    maxRetries: numberSetting(values, MAX_RETRIES_KEY),
    homophones: area === "speaking" ? seedHomophones() : [],
  };
}

/** 배치 화면 자료(시작하지 않는다 — 읽기만). 단계가 정해진 영역은 placed. */
export async function readPlacementPage(
  { area }: { area: PlacementArea },
  { db = getDb() }: { db?: Db } = {},
): Promise<PlacementPage> {
  const profile = await readHouseholdProfile({ db });
  if (!profile) return { kind: "no_profile" };
  const track = await trackOf(db, profile.id, area);
  // 트랙 행이 없으면 첫 실행이 덜 된 집이다 — 수업 목록(배치로 되돌려 보냄)과 오가지 않게 첫 실행 쪽으로
  if (!track) return { kind: "no_profile" };
  if (track.level !== null) return { kind: "placed" };
  const config = await configOf(db, area);
  const open = await openPlacement(db, profile.id, area);
  if (!open) {
    const values = await settingValues(db, [ITEMS_PER_AREA_KEY]);
    return {
      kind: "screen",
      screen: {
        kind: "ready",
        maxItems: numberSetting(values, ITEMS_PER_AREA_KEY),
      },
      config,
    };
  }
  const through = numberSetting(
    await settingValues(db, [THROUGH_KEY]),
    THROUGH_KEY,
  );
  const form = await readForm(db, area, open.test.startRevision);
  return {
    kind: "screen",
    screen: await screenOf(db, area, open.session, open.test, form, through),
    config,
  };
}

// ── 쓰기 ──

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 3; depth += 1) {
    if ((current as { code?: unknown }).code === UNIQUE_VIOLATION) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

function unavailable(what: string, error: unknown): PlacementOutcome {
  if (error instanceof SettingMissingError) {
    console.error(`${what} 실패(설정 ${error.key} 가 없습니다)`);
  } else {
    console.error(`${what} 실패(${dbErrorTag(error)})`);
  }
  return { ok: false, reason: "unavailable" };
}

/** 배치 시작(진행 중이면 그것을 돌려준다 — 이어 보기). 단계가 정해진 영역은 not_pending. */
export async function beginPlacement(
  { area }: { area: PlacementArea },
  { db = getDb(), now }: PlacementDeps,
): Promise<PlacementOutcome> {
  try {
    return await beginUnsafe(area, db, now());
  } catch (error) {
    // 두 기기가 함께 시작하면 진행 세션 부분 유일 색인이 둘째를 막는다 — 첫째의 배치를 돌려준다
    if (isUniqueViolation(error)) {
      try {
        return await beginUnsafe(area, db, now());
      } catch (again) {
        return unavailable("배치 평가 시작", again);
      }
    }
    return unavailable("배치 평가 시작", error);
  }
}

async function beginUnsafe(
  area: PlacementArea,
  db: Db,
  at: Date,
): Promise<PlacementOutcome> {
  const profile = await readHouseholdProfile({ db });
  if (!profile) return { ok: false, reason: "no_profile" };
  const track = await trackOf(db, profile.id, area);
  if (!track || track.level !== null)
    return { ok: false, reason: "not_pending" };
  const through = numberSetting(
    await settingValues(db, [THROUGH_KEY]),
    THROUGH_KEY,
  );
  const open = await openPlacement(db, profile.id, area);
  if (open) {
    const form = await readForm(db, area, open.test.startRevision);
    return {
      ok: true,
      screen: await screenOf(db, area, open.session, open.test, form, through),
    };
  }
  const values = await settingValues(db, PLACEMENT_KEYS);
  const snapshot = placementSnapshotOf((key) => values[key]);
  const startRevision = await currentSeedRevision({ db });
  const created = await db.transaction(async (tx) => {
    const [test] = await tx
      .insert(levelTests)
      .values({
        profileId: profile.id,
        kind: "placement",
        area,
        level: null,
        round: PLACEMENT_ROUND,
        form: PLACEMENT_FORM,
        startRevision,
        settingsSnapshot: snapshot,
        itemIds: [],
        answers: [],
        startedAt: at,
      })
      .returning();
    if (!test) throw new Error("평가 기록을 넣지 못했다");
    const [session] = await tx
      .insert(sessions)
      .values({
        profileId: profile.id,
        area,
        kind: "placement",
        levelTestId: test.id,
        status: "in_progress",
        startedAt: at,
      })
      .returning();
    if (!session) throw new Error("세션을 넣지 못했다");
    return { test, session };
  });
  const form = await readForm(db, area, startRevision);
  return {
    ok: true,
    screen: await screenOf(
      db,
      area,
      created.session,
      created.test,
      form,
      through,
    ),
  };
}

/** 답 꼴이 문항 갈래에 맞는가(맞지 않으면 invalid — 채점하지 않는다). */
function answerFits(item: PlacementItem, answer: Answer): boolean {
  if (answer.kind === "dont-know") return true;
  switch (item.type) {
    case "repeat":
      return answer.kind === "repeat" || answer.kind === "repeat-failed";
    case "copy-tiles":
    case "build-tiles":
    case "fill-letters":
    case "assemble-phrase":
    case "assemble-sentence":
      return answer.kind === "tiles";
    case "dictation":
    case "fill-blank":
    case "fix-sentence":
      return answer.kind === "text";
    default:
      return answer.kind === "choice";
  }
}

/** 답 저장 · 채점 · 다음 차례(끝이면 같은 트랜잭션에서 결과). 같은 시도 id 는 한 번만 저장한다(8절 네트워크). */
export async function submitPlacementAnswer(
  raw: unknown,
  { db = getDb(), now, homophones = seedHomophones }: PlacementDeps,
): Promise<PlacementOutcome> {
  const parsed = AnswerInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  try {
    return await answerUnsafe(parsed.data, db, now(), homophones);
  } catch (error) {
    return unavailable("배치 평가 답 저장", error);
  }
}

async function answerUnsafe(
  input: z.infer<typeof AnswerInputSchema>,
  db: Db,
  at: Date,
  homophones: () => string[][],
): Promise<PlacementOutcome> {
  const profile = await readHouseholdProfile({ db });
  if (!profile) return { ok: false, reason: "no_profile" };
  const [session] = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.id, input.sessionId),
        eq(sessions.profileId, profile.id),
        eq(sessions.kind, "placement"),
      ),
    );
  if (!session?.levelTestId || session.area === "talk")
    return { ok: false, reason: "invalid" };
  const area = session.area;
  const values = await settingValues(db, firstRunSettingKeys());
  const through = numberSetting(values, THROUGH_KEY);
  // 문항 칸 · 시드 개정은 시드 자료라 트랜잭션 밖 연결로 읽는다(시작 개정은 배치 동안 바뀌지 않는다)
  const [started] = await db
    .select({ startRevision: levelTests.startRevision })
    .from(levelTests)
    .where(eq(levelTests.id, session.levelTestId));
  if (!started) return { ok: false, reason: "invalid" };
  const form = await readForm(db, area, started.startRevision);
  const seedRevision = await currentSeedRevision({ db });

  return db.transaction(async (tx) => {
    // 같은 배치의 답이 함께 오면 차례대로(평가 기록 행을 잠근다)
    const [test] = await tx
      .select()
      .from(levelTests)
      .where(eq(levelTests.id, session.levelTestId as string))
      .for("update");
    if (!test) return { ok: false, reason: "invalid" } as const;
    const [current] = await tx
      .select()
      .from(sessions)
      .where(eq(sessions.id, session.id));
    if (!current) return { ok: false, reason: "invalid" } as const;

    // 이미 받은 시도면 지금 화면을 그대로(다시 보내기)
    const [seen] = await tx
      .select({ id: attempts.id })
      .from(attempts)
      .where(eq(attempts.clientAttemptId, input.clientAttemptId));
    if (seen)
      return {
        ok: true,
        screen: await screenOf(db, area, current, test, form, through),
      } as const;
    if (current.status !== "in_progress")
      return { ok: false, reason: "stale" } as const;

    const step = stepOf(test, form, through);
    if (step.kind === "done") return { ok: false, reason: "stale" } as const;
    const entry = form.get(formKey(step.level, step.slot, step.no));
    if (!entry || entry.row.id !== input.itemId)
      return { ok: false, reason: "stale" } as const;

    const answer: Answer = input.answer;
    const snapshot = test.settingsSnapshot as Record<string, unknown>;
    if (!answerFits(entry.item, answer))
      return { ok: false, reason: "invalid" } as const;
    if (
      answer.kind === "repeat" &&
      answer.heard.length > numberSetting(snapshot, "placement.repeat_tries")
    )
      return { ok: false, reason: "invalid" } as const;
    if (answer.kind === "repeat-failed" && step.slot !== "main")
      return { ok: false, reason: "invalid" } as const;

    const options: CheckOptions = {
      repeatPass: numberSetting(snapshot, "placement.repeat_pass"),
      homophones: homophones(),
    };
    const checked = checkAnswer(entry.item as CheckItem, answer, options);
    const record: StoredAnswer = {
      itemId: entry.row.id,
      level: step.level,
      slot: step.slot,
      no: step.no,
      correct: checked.correct,
      dontKnow: answer.kind === "dont-know",
      repeatFailed: answer.kind === "repeat-failed",
    };
    const answers = [...storedAnswers(test.answers), record];
    const itemIds = [
      ...z.array(z.string()).parse(test.itemIds ?? []),
      entry.row.id,
    ];
    const inserted = await tx
      .insert(attempts)
      .values({
        sessionId: session.id,
        clientAttemptId: input.clientAttemptId,
        activityNo: answers.length,
        input: answer,
        attemptedAt: at,
        score: checked.correct ? 1 : 0,
        status: "done",
      })
      .onConflictDoNothing()
      .returning({ id: attempts.id });
    if (inserted.length === 0) {
      // 다른 요청이 같은 시도 id 를 먼저 넣었다 — 그 결과를 돌려준다
      return {
        ok: true,
        screen: await screenOf(db, area, current, test, form, through),
      } as const;
    }
    const [updated] = await tx
      .update(levelTests)
      .set({ answers, itemIds })
      .where(eq(levelTests.id, test.id))
      .returning();
    if (!updated) throw new Error("평가 기록을 고치지 못했다");

    const next = stepOf(updated, form, through);
    if (next.kind === "item")
      return {
        ok: true,
        screen: await screenOf(db, area, current, updated, form, through),
      } as const;

    // ── 끝: 결과(값 12) ──
    const read = (key: string) => values[key];
    const totalScore = answers.filter(
      (a) => !a.repeatFailed && a.correct,
    ).length;
    const learningDay = learningDayOf(
      at,
      values[TIMEZONE_KEY] as string,
      numberSetting(values, DAY_START_KEY),
    );
    const talk = await trackOf(tx, profile.id, "talk");
    const [version] = await tx
      .select({ v: max(settings.version) })
      .from(settings);
    const finish = placementFinishOf({
      profileId: profile.id,
      area,
      result: next.result,
      talkPending: talk !== undefined && talk.level === null,
      read,
      seedRevision,
      settingsVersion: Number(version?.v ?? 0),
      now: at,
    });
    await tx
      .update(levelTests)
      .set({
        completedAt: at,
        placementStartLevel: next.result.start,
        totalScore,
      })
      .where(eq(levelTests.id, test.id));
    await tx
      .update(sessions)
      .set({ status: "completed", completedAt: at, learningDay })
      .where(eq(sessions.id, session.id));
    await tx
      .update(profileTracks)
      .set(finish.track)
      .where(
        and(
          eq(profileTracks.profileId, profile.id),
          eq(profileTracks.area, area),
        ),
      );
    if (finish.talkTrack)
      await tx
        .update(profileTracks)
        .set(finish.talkTrack)
        .where(
          and(
            eq(profileTracks.profileId, profile.id),
            eq(profileTracks.area, "talk"),
          ),
        );
    await tx
      .insert(unitProgress)
      .values(finish.entries.map((e) => e.unitProgress));
    await tx.insert(progressEvents).values(finish.entries.map((e) => e.event));
    const alerts = [
      ...finish.entries.flatMap((e) => (e.rangeAlert ? [e.rangeAlert] : [])),
      ...finish.alerts,
    ];
    // 이 영역 배치는 한 번만 끝난다 — 같은 기준 키의 앞선 알림이 없어 바로 넣는다(첫 실행 저장과 같은 꼴)
    if (alerts.length > 0) await tx.insert(parentAlerts).values(alerts);
    return {
      ok: true,
      screen: {
        kind: "done",
        area,
        start: next.result.start,
        alphabet: next.result.alphabet,
        usedSpares: next.result.usedSpares,
      },
    } as const;
  });
}

export type MicAlertOutcome =
  | { ok: true }
  | { ok: false; reason: "invalid" | "no_profile" | "unavailable" };

/** 배치 도중 마이크 알림(7절 — '마이크를 쓸 수 없음' · '마이크가 멈춤'). 그 학습일에 종류마다 한 번. */
export async function recordPlacementMicAlert(
  raw: unknown,
  { db = getDb(), now }: PlacementDeps,
): Promise<MicAlertOutcome> {
  const parsed = MicAlertSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false, reason: "no_profile" };
    const values = await settingValues(db, [TIMEZONE_KEY, DAY_START_KEY]);
    const at = now();
    await createAlertOnce(db, {
      kind: parsed.data.kind,
      profileId: profile.id,
      thresholdKey: null,
      learningDay: learningDayOf(
        at,
        values[TIMEZONE_KEY] as string,
        numberSetting(values, DAY_START_KEY),
      ),
      value: { code: parsed.data.code, browser: parsed.data.browser },
      createdAt: at,
      once: "day",
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof SettingMissingError)
      console.error(`마이크 알림 실패(설정 ${error.key} 가 없습니다)`);
    else console.error(`마이크 알림 실패(${dbErrorTag(error)})`);
    return { ok: false, reason: "unavailable" };
  }
}

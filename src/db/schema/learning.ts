// 학습 기록 테이블 13(정본 5절, plan-p03a 파일별 값 2 · 3).
// server-only 를 가져오지 않는다. 시각 열에 기본값을 두지 않는다(한 시계, 11절 (4-1)).
// 프로필 쪽 행은 프로필을 따라 지우고(5.1), 시드 행을 가리키는 키는 지우기를 막는다(5절).
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  doublePrecision,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  areaEnum,
  askKindEnum,
  attemptStatusEnum,
  heardHelpEnum,
  hintKindEnum,
  inputModeEnum,
  lessons,
  levelTestKindEnum,
  sessionKindEnum,
  sessionStatusEnum,
  speakerEnum,
  starReasonEnum,
  talkSegmentEnum,
  vocab,
  vocabStateEnum,
  writingPartEnum,
} from "./content";
import { jsonb } from "./jsonb";

const tstz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });
const day = (name: string) => date(name, { mode: "string" });

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  displayName: text("display_name").notNull(),
  englishName: text("english_name").notNull(),
  // 영어 이름이 vocab 단어와 같을 때의 별명(FR-1)
  toriNickname: text("tori_nickname"),
  avatar: text("avatar").notNull(),
  topicBundle: text("topic_bundle").notNull(),
  alphabetStart: boolean("alphabet_start").notNull(),
  // 안내 종류 → 보인 시각
  noticesSeen: jsonb("notices_seen").notNull().default({}),
  // 고른 회화 선생님(seed/teachers.json 키). 비었으면 아직 고르지 않음 — 5절 · C130, 선생님 화면 plan 값 7
  teacherKey: text("teacher_key"),
}).enableRLS();

const profileRef = () =>
  uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" });

export const profileTracks = pgTable(
  "profile_tracks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: profileRef(),
    area: areaEnum("area").notNull(),
    // 배치 전 비움
    level: smallint("level"),
    unit: smallint("unit"),
    placementLevel: smallint("placement_level"),
    chosenStartLevel: smallint("chosen_start_level"),
    graduated: boolean("graduated").notNull().default(false),
    nextLevelPending: boolean("next_level_pending").notNull().default(false),
    // 회화 행
    friendship: smallint("friendship"),
    toriStoriesOpened: smallint("tori_stories_opened"),
    // 구간 → 그 구간에서 연 토리 이야기 수(C98 — 열 하나면 구간이 바뀔 때 앞 구간 기록을 잃는다)
    toriStoriesByBand: jsonb("tori_stories_by_band"),
  },
  (t) => [
    unique("profile_tracks_profile_area_unique").on(t.profileId, t.area),
    check("profile_tracks_level_check", sql`${t.level} >= 1`),
    check("profile_tracks_unit_check", sql`${t.unit} >= 0`),
  ],
).enableRLS();

export const levelTests = pgTable(
  "level_tests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: profileRef(),
    kind: levelTestKindEnum("kind").notNull(),
    area: areaEnum("area").notNull(),
    level: smallint("level"),
    round: smallint("round").notNull(),
    // 벌
    form: smallint("form").notNull(),
    startRevision: integer("start_revision").notNull(),
    settingsSnapshot: jsonb("settings_snapshot").notNull(),
    itemIds: jsonb("item_ids").notNull(),
    answers: jsonb("answers"),
    itemScores: jsonb("item_scores"),
    totalScore: doublePrecision("total_score"),
    passed: boolean("passed"),
    placementStartLevel: smallint("placement_start_level"),
    startedAt: tstz("started_at").notNull(),
    completedAt: tstz("completed_at"),
  },
  (t) => [
    check("level_tests_level_check", sql`${t.level} >= 1`),
    check("level_tests_start_revision_check", sql`${t.startRevision} >= 0`),
  ],
).enableRLS();

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: profileRef(),
    area: areaEnum("area").notNull(),
    level: smallint("level"),
    unit: smallint("unit"),
    lessonId: uuid("lesson_id").references(() => lessons.id, {
      onDelete: "restrict",
    }),
    levelTestId: uuid("level_test_id").references(() => levelTests.id, {
      onDelete: "cascade",
    }),
    kind: sessionKindEnum("kind").notNull(),
    writingPart: writingPartEnum("writing_part"),
    talkSegment: talkSegmentEnum("talk_segment"),
    status: sessionStatusEnum("status").notNull(),
    score: doublePrecision("score"),
    // 영어로 말한 문장 수(C12 · C41)
    englishSentences: integer("english_sentences").notNull().default(0),
    startedAt: tstz("started_at").notNull(),
    completedAt: tstz("completed_at"),
    // 끝낸 학습일 — 완료 · 중단 때 채우고 진행 중은 비운다(C56 (1))
    learningDay: day("learning_day"),
    seedRevision: integer("seed_revision"),
    seedCorrection: integer("seed_correction"),
  },
  (t) => [
    // 프로필 × 영역마다 진행 중 세션은 하나다(5절)
    uniqueIndex("sessions_one_in_progress_unique")
      .on(t.profileId, t.area)
      .where(sql`${t.status} = 'in_progress'`),
    check("sessions_level_check", sql`${t.level} >= 1`),
    check("sessions_unit_check", sql`${t.unit} >= 0`),
  ],
).enableRLS();

const sessionRef = () =>
  uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" });

export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: sessionRef(),
    // 기기가 만든 시도 id
    clientAttemptId: text("client_attempt_id").notNull(),
    activityNo: smallint("activity_no").notNull(),
    input: jsonb("input"),
    attemptedAt: tstz("attempted_at").notNull(),
    aiFeedback: jsonb("ai_feedback"),
    score: doublePrecision("score"),
    // 단어별 정오
    wordResults: jsonb("word_results"),
    wordCount: integer("word_count"),
    status: attemptStatusEnum("status").notNull(),
  },
  (t) => [unique("attempts_client_attempt_id_unique").on(t.clientAttemptId)],
).enableRLS();

export const talkTurns = pgTable(
  "talk_turns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: sessionRef(),
    turnNo: smallint("turn_no").notNull(),
    segment: talkSegmentEnum("segment").notNull(),
    clientAttemptId: text("client_attempt_id"),
    speaker: speakerEnum("speaker").notNull(),
    text: text("text"),
    inputMode: inputModeEnum("input_mode"),
    hintKind: hintKindEnum("hint_kind"),
    hintLevel: smallint("hint_level"),
    heardHelp: heardHelpEnum("heard_help"),
    targetWords: text("target_words").array(),
    askKind: askKindEnum("ask_kind"),
    selfUsedWords: text("self_used_words").array(),
    // 막힘으로 볼 말(C36)
    stuckPhrase: text("stuck_phrase"),
    // 회화 턴이 가리킨 카드 질문 번호(C19)
    cardQuestionNo: smallint("card_question_no"),
    saidWords: text("said_words").array(),
    // 1~3단계 토리 반응의 한국어 뜻(이어 하기 · 다시 흘림, C103)
    toriKo: text("tori_ko"),
    // 토리가 되풀이한 바른 문장
    recast: text("recast"),
    explanation: text("explanation"),
    newWords: text("new_words").array(),
    missionChecks: jsonb("mission_checks"),
    withinTarget: boolean("within_target"),
    overLength: boolean("over_length"),
    wordCount: integer("word_count"),
    sentUserMessage: text("sent_user_message"),
    // 다시 쓸 토리 차례
    toriRewrite: text("tori_rewrite"),
    // 토리 행이 붙인 1~3단계 AI 질문(영어 · 뜻 · 답 예시 · 힌트 단, C101)
    aiQuestion: jsonb("ai_question"),
    perceivedWaitMs: integer("perceived_wait_ms"),
    listenEndSeconds: doublePrecision("listen_end_seconds"),
    // C23
    confirmSkipped: boolean("confirm_skipped"),
    // 아이 행의 듣기 사건 요약(C149 — '모름'의 출처 · 기기 · 3D · 듣기마다 결과 · 끝난 까닭 · 길이 · 소리 · 읽기 관계, 글 · 소리 없음)
    clientListen: jsonb("client_listen"),
    recordedAt: tstz("recorded_at").notNull(),
  },
  (t) => [
    uniqueIndex("talk_turns_client_attempt_id_unique")
      .on(t.clientAttemptId)
      .where(sql`${t.clientAttemptId} IS NOT NULL`),
  ],
).enableRLS();

export const talkSummaries = pgTable("talk_summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: profileRef(),
  sessionId: sessionRef(),
  learningDay: day("learning_day").notNull(),
  summary: text("summary").notNull(),
  recordedAt: tstz("recorded_at").notNull(),
}).enableRLS();

export const vocabProgress = pgTable(
  "vocab_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: profileRef(),
    vocabId: uuid("vocab_id")
      .notNull()
      .references(() => vocab.id, { onDelete: "restrict" }),
    state: vocabStateEnum("state").notNull(),
    streak: smallint("streak").notNull().default(0),
    nextReviewDay: day("next_review_day"),
    known: boolean("known").notNull().default(false),
    firstArea: areaEnum("first_area").notNull(),
    metAreas: areaEnum("met_areas").array().notNull(),
    firstMetDay: day("first_met_day").notNull(),
    // '말함' 행만
    saidDays: day("said_days").array(),
  },
  (t) => [
    unique("vocab_progress_profile_vocab_state_unique").on(
      t.profileId,
      t.vocabId,
      t.state,
    ),
  ],
).enableRLS();

export const unitProgress = pgTable(
  "unit_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: profileRef(),
    area: areaEnum("area").notNull(),
    level: smallint("level").notNull(),
    unit: smallint("unit").notNull(),
    // 회차
    round: smallint("round").notNull(),
    startedAt: tstz("started_at").notNull(),
    startRevision: integer("start_revision").notNull(),
    settingsVersion: bigint("settings_version", { mode: "number" }).notNull(),
    settingsSnapshot: jsonb("settings_snapshot").notNull(),
    remedialCount: smallint("remedial_count").notNull().default(0),
    // 부모 확인 상태. 값은 P12 가 정한다(C56 (4))
    parentCheck: text("parent_check"),
    lastJudgement: jsonb("last_judgement"),
    lastJudgedAt: tstz("last_judged_at"),
    passedAt: tstz("passed_at"),
  },
  (t) => [
    unique("unit_progress_round_unique").on(
      t.profileId,
      t.area,
      t.level,
      t.unit,
      t.round,
    ),
    check("unit_progress_level_check", sql`${t.level} >= 1`),
    check("unit_progress_unit_check", sql`${t.unit} >= 0`),
    check("unit_progress_start_revision_check", sql`${t.startRevision} >= 0`),
  ],
).enableRLS();

export const starLedger = pgTable("star_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: profileRef(),
  learningDay: day("learning_day").notNull(),
  area: areaEnum("area").notNull(),
  sessionId: uuid("session_id").references(() => sessions.id, {
    onDelete: "set null",
  }),
  reason: starReasonEnum("reason").notNull(),
  count: smallint("count").notNull(),
}).enableRLS();

export const badges = pgTable(
  "badges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: profileRef(),
    area: areaEnum("area").notNull(),
    level: smallint("level").notNull(),
    unit: smallint("unit").notNull(),
    earnedAt: tstz("earned_at").notNull(),
  },
  (t) => [
    check("badges_level_check", sql`${t.level} >= 1`),
    check("badges_unit_check", sql`${t.unit} >= 0`),
  ],
).enableRLS();

export const rewards = pgTable("rewards", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: profileRef(),
  name: text("name").notNull(),
  starsRequired: integer("stars_required").notNull(),
  unlockedAt: tstz("unlocked_at"),
  givenAt: tstz("given_at"),
}).enableRLS();

export const dailySentences = pgTable("daily_sentences", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: profileRef(),
  learningDay: day("learning_day").notNull(),
  area: areaEnum("area").notNull(),
  sentence: text("sentence").notNull(),
  attemptId: uuid("attempt_id").references(() => attempts.id, {
    onDelete: "set null",
  }),
}).enableRLS();

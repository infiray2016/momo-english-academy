// 설정 · 인증 · AI · 알림 · 신고 테이블 8(정본 5절 · 6.1 · 8절, plan-p03a 파일별 값 2 · 3).
// server-only 를 가져오지 않는다. 시각 열에 기본값을 두지 않는다(한 시계, 11절 (4-1)).
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  aiCallStatusEnum,
  aiPurposeEnum,
  aiRestReasonEnum,
  eventActorEnum,
  lessons,
  levelTestItems,
  parentAuthKindEnum,
  placementItems,
  progressEventKindEnum,
  reportReasonEnum,
  reportSourceEnum,
  reportStatusEnum,
  settingScopeEnum,
} from "./content";
import { jsonb } from "./jsonb";
import { profiles, sessions } from "./learning";

const tstz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });
const day = (name: string) => date(name, { mode: "string" });

export const settings = pgTable(
  "settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    scope: settingScopeEnum("scope").notNull(),
    // 집 전체 키와 프로필 키의 기본 행은 비운다(12절, B5-19)
    profileId: uuid("profile_id").references(() => profiles.id, {
      onDelete: "cascade",
    }),
    value: jsonb("value").notNull(),
    // 설정 판 — settings 전체의 변경 일련번호(5절)
    version: bigint("version", { mode: "number" }).notNull(),
  },
  (t) => [
    unique("settings_key_profile_unique")
      .on(t.key, t.profileId)
      .nullsNotDistinct(),
    check(
      "settings_household_no_profile_check",
      sql`${t.scope} <> 'household' OR ${t.profileId} IS NULL`,
    ),
  ],
).enableRLS();

export const settingsHistory = pgTable("settings_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull(),
  profileId: uuid("profile_id").references(() => profiles.id, {
    onDelete: "cascade",
  }),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value").notNull(),
  changedAt: tstz("changed_at").notNull(),
  // 적용 시작 단원
  appliesFrom: text("applies_from"),
  // 값은 P7 이 정한다('시드 적재' 등, C56 (4))
  source: text("source").notNull(),
}).enableRLS();

export const parentAuth = pgTable(
  "parent_auth",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: parentAuthKindEnum("kind").notNull(),
    pinHash: text("pin_hash"),
    // 접근 코드 실패를 세는 IP 행(C56 (3))
    ipHash: text("ip_hash"),
    failedCount: smallint("failed_count").notNull().default(0),
    lockedUntil: tstz("locked_until"),
    updatedAt: tstz("updated_at").notNull(),
  },
  (t) => [
    unique("parent_auth_ip_hash_unique").on(t.ipHash),
    // PIN 은 집에 하나(10절)
    uniqueIndex("parent_auth_one_pin_unique")
      .on(t.kind)
      .where(sql`${t.kind} = 'pin'`),
    check(
      "parent_auth_kind_columns_check",
      sql`(${t.kind} = 'pin' AND ${t.ipHash} IS NULL) OR (${t.kind} = 'access_ip' AND ${t.ipHash} IS NOT NULL AND ${t.pinHash} IS NULL)`,
    ),
  ],
).enableRLS();

export const aiCalls = pgTable(
  "ai_calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // 프로필 삭제 때 비우고 비용 합계는 남긴다(5.1)
    profileId: uuid("profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    sessionId: uuid("session_id").references(() => sessions.id, {
      onDelete: "set null",
    }),
    calledAt: tstz("called_at").notNull(),
    // 하루 안전 상한은 학습일로 센다(3.1, C56 (2))
    learningDay: day("learning_day").notNull(),
    purpose: aiPurposeEnum("purpose").notNull(),
    requestedModel: text("requested_model").notNull(),
    answeredModel: text("answered_model"),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    cacheWriteTokens: integer("cache_write_tokens").notNull(),
    cacheReadTokens: integer("cache_read_tokens").notNull(),
    costUsd: numeric("cost_usd", {
      precision: 12,
      scale: 6,
      mode: "string",
    }).notNull(),
    // '단가 없음'(6.1, C56 (2))
    priceMissing: boolean("price_missing").notNull().default(false),
    latencyMs: integer("latency_ms"),
    firstSentenceMs: integer("first_sentence_ms"),
    status: aiCallStatusEnum("status").notNull(),
    // 실패 갈래(값 6 의 errorCode). 성공 · 거절 · 검증 실패 · 안전 상한은 비운다(정할 것 나).
    // 값은 `<갈래>` 또는 `<갈래>:<HTTP 상태>` 꼴(timeout · connection · server:529 · same_error:404 …, C63 (3))
    errorCode: text("error_code"),
  },
  // 하루 합 질의가 호출마다 학습일로 돈다(C63 (3))
  (t) => [index("ai_calls_learning_day_idx").on(t.learningDay)],
).enableRLS();

export const aiStatus = pgTable(
  "ai_status",
  {
    // 집 전체 한 행(5절)
    id: smallint("id").primaryKey(),
    resting: boolean("resting").notNull(),
    reason: aiRestReasonEnum("reason"),
    startedAt: tstz("started_at"),
    resumesAt: tstz("resumes_at"),
    nextCheckAt: tstz("next_check_at"),
    checkStep: smallint("check_step").notNull().default(0),
    // 쉬는 상태에 들게 한 마지막 실패 호출의 모델(C1)
    checkModel: text("check_model"),
    consecutiveFailures: smallint("consecutive_failures").notNull().default(0),
  },
  (t) => [check("ai_status_single_row_check", sql`${t.id} = 1`)],
).enableRLS();

export const progressEvents = pgTable("progress_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  kind: progressEventKindEnum("kind").notNull(),
  target: jsonb("target").notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  actor: eventActorEnum("actor").notNull(),
  occurredAt: tstz("occurred_at").notNull(),
}).enableRLS();

export const parentAlerts = pgTable("parent_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  // 집 전체 알림이면 비운다
  profileId: uuid("profile_id").references(() => profiles.id, {
    onDelete: "cascade",
  }),
  // 4절 알림 목록. 값은 P9 · 1-나가 정한다(C56 (4))
  kind: text("kind").notNull(),
  thresholdKey: text("threshold_key"),
  value: jsonb("value"),
  learningDay: day("learning_day").notNull(),
  createdAt: tstz("created_at").notNull(),
  acknowledgedAt: tstz("acknowledged_at"),
}).enableRLS();

export const seedReports = pgTable("seed_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").references(() => profiles.id, {
    onDelete: "cascade",
  }),
  lessonId: uuid("lesson_id").references(() => lessons.id, {
    onDelete: "restrict",
  }),
  levelTestItemId: uuid("level_test_item_id").references(
    () => levelTestItems.id,
    { onDelete: "restrict" },
  ),
  placementItemId: uuid("placement_item_id").references(
    () => placementItems.id,
    { onDelete: "restrict" },
  ),
  // 문항 번호, 회화는 '(장, 턴)'
  itemRef: text("item_ref"),
  reporter: reportSourceEnum("reporter").notNull(),
  reason: reportReasonEnum("reason").notNull(),
  memo: text("memo"),
  status: reportStatusEnum("status").notNull(),
  // 확인 사유
  resolutionNote: text("resolution_note"),
  // 정정 판
  correctedVersion: text("corrected_version"),
  reportedAt: tstz("reported_at").notNull(),
}).enableRLS();

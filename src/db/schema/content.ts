// 공용 열거형과 시드 테이블 8(정본 5절, plan-p03a 파일별 값 2 · 3).
// 이 파일은 drizzle-kit · scripts/ · 시험이 Node 에서 바로 읽으므로 server-only 를 가져오지 않는다.
// 시각 열에는 기본값을 두지 않는다(값은 한 시계에서 받는다, 11절 (4-1)).
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { jsonb } from "./jsonb";

// ── 열거형(값은 영어 식별자, 정본 낱말은 plan-p03a 표) ──

export const areaEnum = pgEnum("area", [
  "reading",
  "writing",
  "speaking",
  "talk",
]);
export const lessonKindEnum = pgEnum("lesson_kind", [
  "assigned",
  "reinforce",
  "remedial",
  "alphabet",
  "tori_story",
]);
export const sessionKindEnum = pgEnum("session_kind", [
  "regular",
  "remedial",
  "practice",
  "untried",
  "retry",
  "review",
  "level_test",
  "placement",
]);
export const sessionStatusEnum = pgEnum("session_status", [
  "in_progress",
  "completed",
  "archived",
  "aborted",
]);
export const writingPartEnum = pgEnum("writing_part", ["draft", "rewrite"]);
export const talkSegmentEnum = pgEnum("talk_segment", [
  "greeting",
  "today_words",
  "practice",
  "talk",
  "more_talk",
  "wrap_up",
]);
export const attemptStatusEnum = pgEnum("attempt_status", [
  "done",
  "awaiting_feedback",
  "feedback_failed",
]);
export const speakerEnum = pgEnum("speaker", ["tori", "child"]);
export const inputModeEnum = pgEnum("input_mode", ["speech", "dont_know"]);
export const hintKindEnum = pgEnum("hint_kind", [
  "english",
  "meaning_only",
  "none",
]);
export const heardHelpEnum = pgEnum("heard_help", [
  "two_answers",
  "answer_example",
]);
export const askKindEnum = pgEnum("ask_kind", ["first", "re_ask"]);
export const vocabStateEnum = pgEnum("vocab_state", [
  "recognize",
  "write",
  "say",
]);
export const levelTestKindEnum = pgEnum("level_test_kind", [
  "level_test",
  "placement",
  "re_placement",
]);
export const starReasonEnum = pgEnum("star_reason", [
  "new_lesson",
  "untried_lesson",
]);
export const imageLicenseEnum = pgEnum("image_license", [
  "cc0",
  "cc_by",
  "generated",
]);
export const settingScopeEnum = pgEnum("setting_scope", [
  "household",
  "profile",
]);
export const parentAuthKindEnum = pgEnum("parent_auth_kind", [
  "pin",
  "access_ip",
]);
export const aiPurposeEnum = pgEnum("ai_purpose", [
  "writing_feedback",
  "writing_check",
  "speaking_eval",
  "thinkout",
  "talk_turn",
  "talk_closing",
  "probe",
]);
export const aiCallStatusEnum = pgEnum("ai_call_status", [
  "success",
  "refusal",
  "validation_failed",
  "timeout",
  "error",
  "limit",
  "safety_cap",
]);
export const aiRestReasonEnum = pgEnum("ai_rest_reason", [
  "daily_cap",
  "console_limit",
  "connection",
  "account",
]);
export const progressEventKindEnum = pgEnum("progress_event_kind", [
  "auto_judgement",
  "parent_adjustment",
  "revert",
  "promoted_without_pass",
  "next_level_pending",
  "seed_correction_recalc",
  "recalc_takeback",
]);
export const eventActorEnum = pgEnum("event_actor", [
  "app",
  "parent",
  "developer",
]);
export const reportSourceEnum = pgEnum("report_source", [
  "child",
  "parent",
  "developer",
]);
export const reportReasonEnum = pgEnum("report_reason", [
  "wrong_answer",
  "both_correct",
  "inappropriate",
  "too_hard",
  "other",
  "review_ok",
  "review_easy",
  "review_hard",
  "review_error",
]);
export const reportStatusEnum = pgEnum("report_status", [
  "received",
  "confirmed",
  "no_issue",
  "corrected",
]);

// ── 시드 테이블 8 ──
// 단계 · 단원 수(12 · 5)는 확인 제약에 넣지 않는다. level >= 1 · unit >= 0 · 시드 판 >= 0 만 둔다.
// 시드 판 '개정.정정'(5절)은 정수 열 둘 revision · correction 이다.

export const levelSpecs = pgTable(
  "level_specs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    area: areaEnum("area").notNull(),
    level: smallint("level").notNull(),
    cefr: text("cefr").notNull(),
    band: text("band").notNull(),
    canDo: text("can_do").notNull(),
    spec: jsonb("spec").notNull(),
    revision: integer("revision").notNull(),
    correction: integer("correction").notNull(),
  },
  (t) => [
    unique("level_specs_slot_unique").on(
      t.area,
      t.level,
      t.revision,
      t.correction,
    ),
    check("level_specs_level_check", sql`${t.level} >= 1`),
    check(
      "level_specs_version_check",
      sql`${t.revision} >= 0 AND ${t.correction} >= 0`,
    ),
  ],
).enableRLS();

export const unitSpecs = pgTable(
  "unit_specs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    area: areaEnum("area").notNull(),
    level: smallint("level").notNull(),
    unit: smallint("unit").notNull(),
    learningPoints: jsonb("learning_points").notNull(),
    topic: text("topic").notNull(),
    targetVocab: text("target_vocab").array().notNull(),
    revision: integer("revision").notNull(),
    correction: integer("correction").notNull(),
  },
  (t) => [
    unique("unit_specs_slot_unique").on(
      t.area,
      t.level,
      t.unit,
      t.revision,
      t.correction,
    ),
    check("unit_specs_level_check", sql`${t.level} >= 1`),
    check("unit_specs_unit_check", sql`${t.unit} >= 0`),
    check(
      "unit_specs_version_check",
      sql`${t.revision} >= 0 AND ${t.correction} >= 0`,
    ),
  ],
).enableRLS();

export const images = pgTable("images", {
  key: text("key").primaryKey(),
  path: text("path").notNull(),
  source: text("source").notNull(),
  license: imageLicenseEnum("license").notNull(),
  attribution: text("attribution"),
  word: text("word"),
}).enableRLS();

export const vocab = pgTable(
  "vocab",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // 시드 키. P4 규격은 단어 자체가 id 이고 적재(P7)가 word 로 잇는다(C54 (3) · C56 (5))
    word: text("word").notNull(),
    meaning: text("meaning").notNull(),
    partsOfSpeech: text("parts_of_speech").array().notNull(),
    example: text("example"),
    bandLevel: smallint("band_level").notNull(),
    forms: jsonb("forms"),
    imageKey: text("image_key").references(() => images.key, {
      onDelete: "restrict",
    }),
  },
  (t) => [
    unique("vocab_word_unique").on(t.word),
    check("vocab_band_level_check", sql`${t.bandLevel} >= 1`),
  ],
).enableRLS();

export const placementItems = pgTable(
  "placement_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    area: areaEnum("area").notNull(),
    level: smallint("level").notNull(),
    // 벌(1 = 가 · 2 = 나), P4 규격과 같은 꼴
    form: smallint("form").notNull(),
    itemNo: smallint("item_no").notNull(),
    isSpare: boolean("is_spare").notNull(),
    itemType: text("item_type").notNull(),
    item: jsonb("item").notNull(),
    answer: jsonb("answer").notNull(),
    revision: integer("revision").notNull(),
    correction: integer("correction").notNull(),
  },
  (t) => [
    unique("placement_items_slot_unique").on(
      t.area,
      t.level,
      t.form,
      t.itemNo,
      t.isSpare,
      t.revision,
      t.correction,
    ),
    check("placement_items_level_check", sql`${t.level} >= 1`),
    check(
      "placement_items_version_check",
      sql`${t.revision} >= 0 AND ${t.correction} >= 0`,
    ),
  ],
).enableRLS();

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    area: areaEnum("area").notNull(),
    level: smallint("level").notNull(),
    // 토리 이야기는 비운다(5절)
    unit: smallint("unit"),
    kind: lessonKindEnum("kind").notNull(),
    lessonNo: smallint("lesson_no").notNull(),
    // 주제 변형 번호, P4 규격과 같은 꼴
    topicVariant: smallint("topic_variant"),
    listTitle: text("list_title").notNull(),
    content: jsonb("content").notNull(),
    newWords: text("new_words").array().notNull(),
    unitWords: text("unit_words").array().notNull(),
    generation: jsonb("generation").notNull(),
    revision: integer("revision").notNull(),
    correction: integer("correction").notNull(),
  },
  (t) => [
    unique("lessons_slot_unique")
      .on(
        t.area,
        t.level,
        t.unit,
        t.kind,
        t.lessonNo,
        t.topicVariant,
        t.revision,
        t.correction,
      )
      .nullsNotDistinct(),
    check("lessons_level_check", sql`${t.level} >= 1`),
    check("lessons_unit_check", sql`${t.unit} >= 0`),
    check(
      "lessons_version_check",
      sql`${t.revision} >= 0 AND ${t.correction} >= 0`,
    ),
  ],
).enableRLS();

export const levelTestItems = pgTable(
  "level_test_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    area: areaEnum("area").notNull(),
    level: smallint("level").notNull(),
    form: smallint("form").notNull(),
    // 회화는 카드 장 번호
    itemNo: smallint("item_no").notNull(),
    itemType: text("item_type").notNull(),
    item: jsonb("item").notNull(),
    revision: integer("revision").notNull(),
    correction: integer("correction").notNull(),
  },
  (t) => [
    unique("level_test_items_slot_unique").on(
      t.area,
      t.level,
      t.form,
      t.itemNo,
      t.revision,
      t.correction,
    ),
    check("level_test_items_level_check", sql`${t.level} >= 1`),
    check(
      "level_test_items_version_check",
      sql`${t.revision} >= 0 AND ${t.correction} >= 0`,
    ),
  ],
).enableRLS();

export const modelPrices = pgTable(
  "model_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    model: text("model").notNull(),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    inputUsdPerMtok: numeric("input_usd_per_mtok", {
      precision: 10,
      scale: 4,
      mode: "string",
    }).notNull(),
    outputUsdPerMtok: numeric("output_usd_per_mtok", {
      precision: 10,
      scale: 4,
      mode: "string",
    }).notNull(),
    cacheWriteUsdPerMtok: numeric("cache_write_usd_per_mtok", {
      precision: 10,
      scale: 4,
      mode: "string",
    }).notNull(),
    cacheReadUsdPerMtok: numeric("cache_read_usd_per_mtok", {
      precision: 10,
      scale: 4,
      mode: "string",
    }).notNull(),
    capabilities: jsonb("capabilities").notNull(),
  },
  (t) => [
    unique("model_prices_model_effective_from_unique").on(
      t.model,
      t.effectiveFrom,
    ),
  ],
).enableRLS();

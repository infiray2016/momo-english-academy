CREATE TYPE "public"."ai_call_status" AS ENUM('success', 'refusal', 'validation_failed', 'timeout', 'error', 'limit', 'safety_cap');--> statement-breakpoint
CREATE TYPE "public"."ai_purpose" AS ENUM('writing_feedback', 'writing_check', 'speaking_eval', 'thinkout', 'talk_turn', 'talk_closing', 'probe');--> statement-breakpoint
CREATE TYPE "public"."ai_rest_reason" AS ENUM('daily_cap', 'console_limit', 'connection', 'account');--> statement-breakpoint
CREATE TYPE "public"."area" AS ENUM('reading', 'writing', 'speaking', 'talk');--> statement-breakpoint
CREATE TYPE "public"."ask_kind" AS ENUM('first', 're_ask');--> statement-breakpoint
CREATE TYPE "public"."attempt_status" AS ENUM('done', 'awaiting_feedback', 'feedback_failed');--> statement-breakpoint
CREATE TYPE "public"."event_actor" AS ENUM('app', 'parent', 'developer');--> statement-breakpoint
CREATE TYPE "public"."heard_help" AS ENUM('two_answers', 'answer_example');--> statement-breakpoint
CREATE TYPE "public"."hint_kind" AS ENUM('english', 'meaning_only', 'none');--> statement-breakpoint
CREATE TYPE "public"."image_license" AS ENUM('cc0', 'cc_by', 'generated');--> statement-breakpoint
CREATE TYPE "public"."input_mode" AS ENUM('speech', 'dont_know');--> statement-breakpoint
CREATE TYPE "public"."lesson_kind" AS ENUM('assigned', 'reinforce', 'remedial', 'alphabet', 'tori_story');--> statement-breakpoint
CREATE TYPE "public"."level_test_kind" AS ENUM('level_test', 'placement', 're_placement');--> statement-breakpoint
CREATE TYPE "public"."parent_auth_kind" AS ENUM('pin', 'access_ip');--> statement-breakpoint
CREATE TYPE "public"."progress_event_kind" AS ENUM('auto_judgement', 'parent_adjustment', 'revert', 'promoted_without_pass', 'next_level_pending', 'seed_correction_recalc', 'recalc_takeback');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('wrong_answer', 'both_correct', 'inappropriate', 'too_hard', 'other', 'review_ok', 'review_easy', 'review_hard', 'review_error');--> statement-breakpoint
CREATE TYPE "public"."report_source" AS ENUM('child', 'parent', 'developer');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('received', 'confirmed', 'no_issue', 'corrected');--> statement-breakpoint
CREATE TYPE "public"."session_kind" AS ENUM('regular', 'remedial', 'practice', 'untried', 'retry', 'review', 'level_test', 'placement');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('in_progress', 'completed', 'archived', 'aborted');--> statement-breakpoint
CREATE TYPE "public"."setting_scope" AS ENUM('household', 'profile');--> statement-breakpoint
CREATE TYPE "public"."speaker" AS ENUM('tori', 'child');--> statement-breakpoint
CREATE TYPE "public"."star_reason" AS ENUM('new_lesson', 'untried_lesson');--> statement-breakpoint
CREATE TYPE "public"."talk_segment" AS ENUM('greeting', 'today_words', 'practice', 'talk', 'more_talk', 'wrap_up');--> statement-breakpoint
CREATE TYPE "public"."vocab_state" AS ENUM('recognize', 'write', 'say');--> statement-breakpoint
CREATE TYPE "public"."writing_part" AS ENUM('draft', 'rewrite');--> statement-breakpoint
CREATE TABLE "images" (
	"key" text PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"source" text NOT NULL,
	"license" "image_license" NOT NULL,
	"attribution" text,
	"word" text
);
--> statement-breakpoint
ALTER TABLE "images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"area" "area" NOT NULL,
	"level" smallint NOT NULL,
	"unit" smallint,
	"kind" "lesson_kind" NOT NULL,
	"lesson_no" smallint NOT NULL,
	"topic_variant" smallint,
	"list_title" text NOT NULL,
	"content" jsonb NOT NULL,
	"new_words" text[] NOT NULL,
	"unit_words" text[] NOT NULL,
	"generation" jsonb NOT NULL,
	"revision" integer NOT NULL,
	"correction" integer NOT NULL,
	CONSTRAINT "lessons_slot_unique" UNIQUE NULLS NOT DISTINCT("area","level","unit","kind","lesson_no","topic_variant","revision","correction"),
	CONSTRAINT "lessons_level_check" CHECK ("lessons"."level" >= 1),
	CONSTRAINT "lessons_unit_check" CHECK ("lessons"."unit" >= 0),
	CONSTRAINT "lessons_version_check" CHECK ("lessons"."revision" >= 0 AND "lessons"."correction" >= 0)
);
--> statement-breakpoint
ALTER TABLE "lessons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "level_specs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"area" "area" NOT NULL,
	"level" smallint NOT NULL,
	"cefr" text NOT NULL,
	"band" text NOT NULL,
	"can_do" text NOT NULL,
	"spec" jsonb NOT NULL,
	"revision" integer NOT NULL,
	"correction" integer NOT NULL,
	CONSTRAINT "level_specs_slot_unique" UNIQUE("area","level","revision","correction"),
	CONSTRAINT "level_specs_level_check" CHECK ("level_specs"."level" >= 1),
	CONSTRAINT "level_specs_version_check" CHECK ("level_specs"."revision" >= 0 AND "level_specs"."correction" >= 0)
);
--> statement-breakpoint
ALTER TABLE "level_specs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "level_test_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"area" "area" NOT NULL,
	"level" smallint NOT NULL,
	"form" smallint NOT NULL,
	"item_no" smallint NOT NULL,
	"item_type" text NOT NULL,
	"item" jsonb NOT NULL,
	"revision" integer NOT NULL,
	"correction" integer NOT NULL,
	CONSTRAINT "level_test_items_slot_unique" UNIQUE("area","level","form","item_no","revision","correction"),
	CONSTRAINT "level_test_items_level_check" CHECK ("level_test_items"."level" >= 1),
	CONSTRAINT "level_test_items_version_check" CHECK ("level_test_items"."revision" >= 0 AND "level_test_items"."correction" >= 0)
);
--> statement-breakpoint
ALTER TABLE "level_test_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "model_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model" text NOT NULL,
	"effective_from" date NOT NULL,
	"input_usd_per_mtok" numeric(10, 4) NOT NULL,
	"output_usd_per_mtok" numeric(10, 4) NOT NULL,
	"cache_write_usd_per_mtok" numeric(10, 4) NOT NULL,
	"cache_read_usd_per_mtok" numeric(10, 4) NOT NULL,
	"capabilities" jsonb NOT NULL,
	CONSTRAINT "model_prices_model_effective_from_unique" UNIQUE("model","effective_from")
);
--> statement-breakpoint
ALTER TABLE "model_prices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "placement_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"area" "area" NOT NULL,
	"level" smallint NOT NULL,
	"form" smallint NOT NULL,
	"item_no" smallint NOT NULL,
	"is_spare" boolean NOT NULL,
	"item_type" text NOT NULL,
	"item" jsonb NOT NULL,
	"answer" jsonb NOT NULL,
	"revision" integer NOT NULL,
	"correction" integer NOT NULL,
	CONSTRAINT "placement_items_slot_unique" UNIQUE("area","level","form","item_no","is_spare","revision","correction"),
	CONSTRAINT "placement_items_level_check" CHECK ("placement_items"."level" >= 1),
	CONSTRAINT "placement_items_version_check" CHECK ("placement_items"."revision" >= 0 AND "placement_items"."correction" >= 0)
);
--> statement-breakpoint
ALTER TABLE "placement_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "unit_specs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"area" "area" NOT NULL,
	"level" smallint NOT NULL,
	"unit" smallint NOT NULL,
	"learning_points" jsonb NOT NULL,
	"topic" text NOT NULL,
	"target_vocab" text[] NOT NULL,
	"revision" integer NOT NULL,
	"correction" integer NOT NULL,
	CONSTRAINT "unit_specs_slot_unique" UNIQUE("area","level","unit","revision","correction"),
	CONSTRAINT "unit_specs_level_check" CHECK ("unit_specs"."level" >= 1),
	CONSTRAINT "unit_specs_unit_check" CHECK ("unit_specs"."unit" >= 0),
	CONSTRAINT "unit_specs_version_check" CHECK ("unit_specs"."revision" >= 0 AND "unit_specs"."correction" >= 0)
);
--> statement-breakpoint
ALTER TABLE "unit_specs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vocab" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"word" text NOT NULL,
	"meaning" text NOT NULL,
	"parts_of_speech" text[] NOT NULL,
	"example" text,
	"band_level" smallint NOT NULL,
	"forms" jsonb,
	"image_key" text,
	CONSTRAINT "vocab_word_unique" UNIQUE("word"),
	CONSTRAINT "vocab_band_level_check" CHECK ("vocab"."band_level" >= 1)
);
--> statement-breakpoint
ALTER TABLE "vocab" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"client_attempt_id" text NOT NULL,
	"activity_no" smallint NOT NULL,
	"input" jsonb,
	"attempted_at" timestamp with time zone NOT NULL,
	"ai_feedback" jsonb,
	"score" double precision,
	"word_results" jsonb,
	"word_count" integer,
	"status" "attempt_status" NOT NULL,
	CONSTRAINT "attempts_client_attempt_id_unique" UNIQUE("client_attempt_id")
);
--> statement-breakpoint
ALTER TABLE "attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"area" "area" NOT NULL,
	"level" smallint NOT NULL,
	"unit" smallint NOT NULL,
	"earned_at" timestamp with time zone NOT NULL,
	CONSTRAINT "badges_level_check" CHECK ("badges"."level" >= 1),
	CONSTRAINT "badges_unit_check" CHECK ("badges"."unit" >= 0)
);
--> statement-breakpoint
ALTER TABLE "badges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "daily_sentences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"learning_day" date NOT NULL,
	"area" "area" NOT NULL,
	"sentence" text NOT NULL,
	"attempt_id" uuid
);
--> statement-breakpoint
ALTER TABLE "daily_sentences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "level_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"kind" "level_test_kind" NOT NULL,
	"area" "area" NOT NULL,
	"level" smallint,
	"round" smallint NOT NULL,
	"form" smallint NOT NULL,
	"start_revision" integer NOT NULL,
	"settings_snapshot" jsonb NOT NULL,
	"item_ids" jsonb NOT NULL,
	"answers" jsonb,
	"item_scores" jsonb,
	"total_score" double precision,
	"passed" boolean,
	"placement_start_level" smallint,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "level_tests_level_check" CHECK ("level_tests"."level" >= 1),
	CONSTRAINT "level_tests_start_revision_check" CHECK ("level_tests"."start_revision" >= 0)
);
--> statement-breakpoint
ALTER TABLE "level_tests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profile_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"area" "area" NOT NULL,
	"level" smallint,
	"unit" smallint,
	"placement_level" smallint,
	"chosen_start_level" smallint,
	"graduated" boolean DEFAULT false NOT NULL,
	"next_level_pending" boolean DEFAULT false NOT NULL,
	"friendship" smallint,
	"tori_stories_opened" smallint,
	CONSTRAINT "profile_tracks_profile_area_unique" UNIQUE("profile_id","area"),
	CONSTRAINT "profile_tracks_level_check" CHECK ("profile_tracks"."level" >= 1),
	CONSTRAINT "profile_tracks_unit_check" CHECK ("profile_tracks"."unit" >= 0)
);
--> statement-breakpoint
ALTER TABLE "profile_tracks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"english_name" text NOT NULL,
	"tori_nickname" text,
	"avatar" text NOT NULL,
	"topic_bundle" text NOT NULL,
	"alphabet_start" boolean NOT NULL,
	"notices_seen" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"name" text NOT NULL,
	"stars_required" integer NOT NULL,
	"unlocked_at" timestamp with time zone,
	"given_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "rewards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"area" "area" NOT NULL,
	"level" smallint,
	"unit" smallint,
	"lesson_id" uuid,
	"level_test_id" uuid,
	"kind" "session_kind" NOT NULL,
	"writing_part" "writing_part",
	"talk_segment" "talk_segment",
	"status" "session_status" NOT NULL,
	"score" double precision,
	"english_sentences" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"learning_day" date,
	"seed_revision" integer,
	"seed_correction" integer,
	CONSTRAINT "sessions_level_check" CHECK ("sessions"."level" >= 1),
	CONSTRAINT "sessions_unit_check" CHECK ("sessions"."unit" >= 0)
);
--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "star_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"learning_day" date NOT NULL,
	"area" "area" NOT NULL,
	"session_id" uuid,
	"reason" "star_reason" NOT NULL,
	"count" smallint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "star_ledger" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "talk_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"learning_day" date NOT NULL,
	"summary" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "talk_summaries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "talk_turns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"turn_no" smallint NOT NULL,
	"segment" "talk_segment" NOT NULL,
	"client_attempt_id" text,
	"speaker" "speaker" NOT NULL,
	"text" text,
	"input_mode" "input_mode",
	"hint_kind" "hint_kind",
	"hint_level" smallint,
	"heard_help" "heard_help",
	"target_words" text[],
	"ask_kind" "ask_kind",
	"self_used_words" text[],
	"stuck_phrase" text,
	"card_question_no" smallint,
	"said_words" text[],
	"recast" text,
	"explanation" text,
	"new_words" text[],
	"mission_checks" jsonb,
	"within_target" boolean,
	"over_length" boolean,
	"word_count" integer,
	"sent_user_message" text,
	"tori_rewrite" text,
	"perceived_wait_ms" integer,
	"listen_end_seconds" double precision,
	"confirm_skipped" boolean,
	"recorded_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "talk_turns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "unit_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"area" "area" NOT NULL,
	"level" smallint NOT NULL,
	"unit" smallint NOT NULL,
	"round" smallint NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"start_revision" integer NOT NULL,
	"settings_version" bigint NOT NULL,
	"settings_snapshot" jsonb NOT NULL,
	"remedial_count" smallint DEFAULT 0 NOT NULL,
	"parent_check" text,
	"last_judgement" jsonb,
	"last_judged_at" timestamp with time zone,
	"passed_at" timestamp with time zone,
	CONSTRAINT "unit_progress_round_unique" UNIQUE("profile_id","area","level","unit","round"),
	CONSTRAINT "unit_progress_level_check" CHECK ("unit_progress"."level" >= 1),
	CONSTRAINT "unit_progress_unit_check" CHECK ("unit_progress"."unit" >= 0),
	CONSTRAINT "unit_progress_start_revision_check" CHECK ("unit_progress"."start_revision" >= 0)
);
--> statement-breakpoint
ALTER TABLE "unit_progress" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vocab_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"vocab_id" uuid NOT NULL,
	"state" "vocab_state" NOT NULL,
	"streak" smallint DEFAULT 0 NOT NULL,
	"next_review_day" date,
	"known" boolean DEFAULT false NOT NULL,
	"first_area" "area" NOT NULL,
	"met_areas" "area"[] NOT NULL,
	"first_met_day" date NOT NULL,
	"said_days" date[],
	CONSTRAINT "vocab_progress_profile_vocab_state_unique" UNIQUE("profile_id","vocab_id","state")
);
--> statement-breakpoint
ALTER TABLE "vocab_progress" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ai_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid,
	"session_id" uuid,
	"called_at" timestamp with time zone NOT NULL,
	"learning_day" date NOT NULL,
	"purpose" "ai_purpose" NOT NULL,
	"requested_model" text NOT NULL,
	"answered_model" text,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"cache_write_tokens" integer NOT NULL,
	"cache_read_tokens" integer NOT NULL,
	"cost_usd" numeric(12, 6) NOT NULL,
	"price_missing" boolean DEFAULT false NOT NULL,
	"latency_ms" integer,
	"first_sentence_ms" integer,
	"status" "ai_call_status" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_calls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ai_status" (
	"id" smallint PRIMARY KEY NOT NULL,
	"resting" boolean NOT NULL,
	"reason" "ai_rest_reason",
	"started_at" timestamp with time zone,
	"resumes_at" timestamp with time zone,
	"next_check_at" timestamp with time zone,
	"check_step" smallint DEFAULT 0 NOT NULL,
	"check_model" text,
	"consecutive_failures" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "ai_status_single_row_check" CHECK ("ai_status"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE "ai_status" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "parent_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid,
	"kind" text NOT NULL,
	"threshold_key" text,
	"value" jsonb,
	"learning_day" date NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"acknowledged_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "parent_alerts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "parent_auth" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "parent_auth_kind" NOT NULL,
	"pin_hash" text,
	"ip_hash" text,
	"failed_count" smallint DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "parent_auth_ip_hash_unique" UNIQUE("ip_hash"),
	CONSTRAINT "parent_auth_kind_columns_check" CHECK (("parent_auth"."kind" = 'pin' AND "parent_auth"."ip_hash" IS NULL) OR ("parent_auth"."kind" = 'access_ip' AND "parent_auth"."ip_hash" IS NOT NULL AND "parent_auth"."pin_hash" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "parent_auth" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "progress_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"kind" "progress_event_kind" NOT NULL,
	"target" jsonb NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"actor" "event_actor" NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "progress_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "seed_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid,
	"lesson_id" uuid,
	"level_test_item_id" uuid,
	"placement_item_id" uuid,
	"item_ref" text,
	"reporter" "report_source" NOT NULL,
	"reason" "report_reason" NOT NULL,
	"memo" text,
	"status" "report_status" NOT NULL,
	"resolution_note" text,
	"corrected_version" text,
	"reported_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seed_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"scope" "setting_scope" NOT NULL,
	"profile_id" uuid,
	"value" jsonb NOT NULL,
	"version" bigint NOT NULL,
	CONSTRAINT "settings_key_profile_unique" UNIQUE NULLS NOT DISTINCT("key","profile_id"),
	CONSTRAINT "settings_household_no_profile_check" CHECK ("settings"."scope" <> 'household' OR "settings"."profile_id" IS NULL)
);
--> statement-breakpoint
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "settings_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"profile_id" uuid,
	"old_value" jsonb,
	"new_value" jsonb NOT NULL,
	"changed_at" timestamp with time zone NOT NULL,
	"applies_from" text,
	"source" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "vocab" ADD CONSTRAINT "vocab_image_key_images_key_fk" FOREIGN KEY ("image_key") REFERENCES "public"."images"("key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badges" ADD CONSTRAINT "badges_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_sentences" ADD CONSTRAINT "daily_sentences_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_sentences" ADD CONSTRAINT "daily_sentences_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_tests" ADD CONSTRAINT "level_tests_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_tracks" ADD CONSTRAINT "profile_tracks_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_level_test_id_level_tests_id_fk" FOREIGN KEY ("level_test_id") REFERENCES "public"."level_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "star_ledger" ADD CONSTRAINT "star_ledger_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "star_ledger" ADD CONSTRAINT "star_ledger_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talk_summaries" ADD CONSTRAINT "talk_summaries_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talk_summaries" ADD CONSTRAINT "talk_summaries_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talk_turns" ADD CONSTRAINT "talk_turns_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_progress" ADD CONSTRAINT "unit_progress_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocab_progress" ADD CONSTRAINT "vocab_progress_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocab_progress" ADD CONSTRAINT "vocab_progress_vocab_id_vocab_id_fk" FOREIGN KEY ("vocab_id") REFERENCES "public"."vocab"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_calls" ADD CONSTRAINT "ai_calls_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_calls" ADD CONSTRAINT "ai_calls_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_alerts" ADD CONSTRAINT "parent_alerts_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_events" ADD CONSTRAINT "progress_events_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seed_reports" ADD CONSTRAINT "seed_reports_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seed_reports" ADD CONSTRAINT "seed_reports_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seed_reports" ADD CONSTRAINT "seed_reports_level_test_item_id_level_test_items_id_fk" FOREIGN KEY ("level_test_item_id") REFERENCES "public"."level_test_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seed_reports" ADD CONSTRAINT "seed_reports_placement_item_id_placement_items_id_fk" FOREIGN KEY ("placement_item_id") REFERENCES "public"."placement_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings_history" ADD CONSTRAINT "settings_history_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_one_in_progress_unique" ON "sessions" USING btree ("profile_id","area") WHERE "sessions"."status" = 'in_progress';--> statement-breakpoint
CREATE UNIQUE INDEX "talk_turns_client_attempt_id_unique" ON "talk_turns" USING btree ("client_attempt_id") WHERE "talk_turns"."client_attempt_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "parent_auth_one_pin_unique" ON "parent_auth" USING btree ("kind") WHERE "parent_auth"."kind" = 'pin';
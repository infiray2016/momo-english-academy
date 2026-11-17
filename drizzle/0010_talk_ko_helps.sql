CREATE TYPE "public"."ko_help_fallback" AS ENUM('none', 'call_failed', 'check_blocked');--> statement-breakpoint
CREATE TYPE "public"."ko_help_kind" AS ENUM('expression', 'meaning', 'unclear', 'other');--> statement-breakpoint
ALTER TYPE "public"."ai_purpose" ADD VALUE 'talk_ko_help';--> statement-breakpoint
CREATE TABLE "talk_ko_helps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"turn_no" smallint NOT NULL,
	"seq" smallint NOT NULL,
	"client_attempt_id" text NOT NULL,
	"question" text NOT NULL,
	"kind" "ko_help_kind",
	"say_ko" text,
	"teach_en" text,
	"shown_en" text[],
	"text_shown" boolean,
	"heard" boolean,
	"replays" smallint,
	"out_of_range" smallint,
	"fallback" "ko_help_fallback",
	"client_listen" jsonb,
	"asked_at" timestamp with time zone NOT NULL,
	"answered_at" timestamp with time zone,
	CONSTRAINT "talk_ko_helps_turn_seq_unique" UNIQUE("session_id","turn_no","seq"),
	CONSTRAINT "talk_ko_helps_client_attempt_id_unique" UNIQUE("client_attempt_id")
);
--> statement-breakpoint
ALTER TABLE "talk_ko_helps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "talk_ko_helps" ADD CONSTRAINT "talk_ko_helps_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "profile_tracks" ADD COLUMN "tori_stories_by_band" jsonb;--> statement-breakpoint
ALTER TABLE "talk_turns" ADD COLUMN "tori_ko" text;--> statement-breakpoint
ALTER TABLE "talk_turns" ADD COLUMN "ai_question" jsonb;
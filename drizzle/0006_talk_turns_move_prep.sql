ALTER TYPE "public"."talk_segment" ADD VALUE 'prep' BEFORE 'today_words';--> statement-breakpoint
ALTER TABLE "talk_turns" ADD COLUMN "move" jsonb;
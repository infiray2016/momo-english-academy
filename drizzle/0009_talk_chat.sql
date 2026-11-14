ALTER TYPE "public"."ai_purpose" ADD VALUE 'talk_chat_hint';--> statement-breakpoint
ALTER TYPE "public"."ai_purpose" ADD VALUE 'talk_chat_eval';--> statement-breakpoint
ALTER TYPE "public"."input_mode" ADD VALUE 'quiet';--> statement-breakpoint
ALTER TABLE "talk_turns" ADD COLUMN "chat_judge" jsonb;
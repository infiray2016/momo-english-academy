ALTER TABLE "ai_calls" ADD COLUMN "error_code" text;--> statement-breakpoint
CREATE INDEX "ai_calls_learning_day_idx" ON "ai_calls" USING btree ("learning_day");
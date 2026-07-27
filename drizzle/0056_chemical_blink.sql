ALTER TABLE "tips" ADD COLUMN "next_verification_at" timestamp;--> statement-breakpoint
CREATE INDEX "tips_verification_due_idx" ON "tips" USING btree ("status","next_verification_at");
-- Baseline reconciliation: user_blocks + users signup/status columns were applied
-- to production via `db:push` and never captured in a migration. This migration is
-- written idempotently so it is a no-op on environments that already have them
-- (production) and creates them on fresh databases built from migrations.
CREATE TABLE IF NOT EXISTS "user_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signup_ip" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signup_country" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signup_user_agent" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signup_method" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "flagged_reason" text;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_blocks_blocker_id_users_id_fk') THEN
		ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_blocks_blocked_id_users_id_fk') THEN
		ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_blocks_blocker_blocked_unique_idx" ON "user_blocks" USING btree ("blocker_id","blocked_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_blocks_blocker_id_idx" ON "user_blocks" USING btree ("blocker_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_blocks_blocked_id_idx" ON "user_blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_signup_ip_idx" ON "users" USING btree ("signup_ip");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_status_idx" ON "users" USING btree ("status");

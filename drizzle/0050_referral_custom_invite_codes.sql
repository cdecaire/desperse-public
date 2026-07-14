CREATE TYPE "public"."referral_invite_code_status_enum" AS ENUM('active', 'retired');--> statement-breakpoint
CREATE TABLE "referral_invite_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" text NOT NULL,
	"status" "referral_invite_code_status_enum" DEFAULT 'active' NOT NULL,
	"retired_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "referral_invite_codes" ADD CONSTRAINT "referral_invite_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "referral_invite_codes_code_lower_unique_idx" ON "referral_invite_codes" USING btree (lower("code"));--> statement-breakpoint
CREATE UNIQUE INDEX "referral_invite_codes_active_user_unique_idx" ON "referral_invite_codes" USING btree ("user_id") WHERE "status" = 'active';--> statement-breakpoint
CREATE INDEX "referral_invite_codes_user_id_idx" ON "referral_invite_codes" USING btree ("user_id");

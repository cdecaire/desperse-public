CREATE TYPE "public"."referral_state_enum" AS ENUM('clicked', 'signup_started', 'account_created', 'pending_activation', 'activated', 'rejected', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."referral_attribution_source_enum" AS ENUM('link', 'manual');--> statement-breakpoint
CREATE TABLE "referral_attribution_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_user_id" uuid NOT NULL,
	"invite_code" text NOT NULL,
	"source" "referral_attribution_source_enum" NOT NULL,
	"referred_user_id" uuid,
	"signup_ip" text,
	"signup_user_agent" text,
	"consumed_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_user_id" uuid NOT NULL,
	"referred_user_id" uuid NOT NULL,
	"attribution_session_id" uuid,
	"invite_code" text NOT NULL,
	"state" "referral_state_enum" DEFAULT 'account_created' NOT NULL,
	"activation_source" text,
	"activation_qualified_follow_user_id" uuid,
	"activation_verified_at" timestamp,
	"state_reason" text,
	"expires_at" timestamp NOT NULL,
	"activated_at" timestamp,
	"expired_at" timestamp,
	"rejected_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_id" uuid,
	"attribution_session_id" uuid,
	"referrer_user_id" uuid,
	"referred_user_id" uuid,
	"event_name" text NOT NULL,
	"payload" jsonb DEFAULT 'null'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "referral_attribution_sessions" ADD CONSTRAINT "referral_attribution_sessions_referrer_user_id_users_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_attribution_sessions" ADD CONSTRAINT "referral_attribution_sessions_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_user_id_users_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_attribution_session_id_referral_attribution_sessions_id_fk" FOREIGN KEY ("attribution_session_id") REFERENCES "public"."referral_attribution_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_activation_qualified_follow_user_id_users_id_fk" FOREIGN KEY ("activation_qualified_follow_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_attribution_session_id_referral_attribution_sessions_id_fk" FOREIGN KEY ("attribution_session_id") REFERENCES "public"."referral_attribution_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_referrer_user_id_users_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "referral_attribution_sessions_referrer_user_id_idx" ON "referral_attribution_sessions" USING btree ("referrer_user_id");--> statement-breakpoint
CREATE INDEX "referral_attribution_sessions_referred_user_id_idx" ON "referral_attribution_sessions" USING btree ("referred_user_id");--> statement-breakpoint
CREATE INDEX "referral_attribution_sessions_invite_code_idx" ON "referral_attribution_sessions" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "referral_attribution_sessions_expires_at_idx" ON "referral_attribution_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "referrals_referred_user_unique_idx" ON "referrals" USING btree ("referred_user_id");--> statement-breakpoint
CREATE INDEX "referrals_referrer_user_id_idx" ON "referrals" USING btree ("referrer_user_id");--> statement-breakpoint
CREATE INDEX "referrals_state_idx" ON "referrals" USING btree ("state");--> statement-breakpoint
CREATE INDEX "referrals_expires_at_idx" ON "referrals" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "referrals_attribution_session_id_idx" ON "referrals" USING btree ("attribution_session_id");--> statement-breakpoint
CREATE INDEX "referral_events_referral_id_idx" ON "referral_events" USING btree ("referral_id");--> statement-breakpoint
CREATE INDEX "referral_events_attribution_session_id_idx" ON "referral_events" USING btree ("attribution_session_id");--> statement-breakpoint
CREATE INDEX "referral_events_event_name_idx" ON "referral_events" USING btree ("event_name");--> statement-breakpoint
CREATE INDEX "referral_events_created_at_idx" ON "referral_events" USING btree ("created_at");
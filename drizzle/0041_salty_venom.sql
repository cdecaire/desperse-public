CREATE TYPE "public"."discord_verification_status_enum" AS ENUM('pending', 'consumed', 'expired');--> statement-breakpoint
CREATE TABLE "discord_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discord_user_id" text NOT NULL,
	"action" text NOT NULL,
	"detail" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discord_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discord_user_id" text NOT NULL,
	"desperse_user_id" uuid NOT NULL,
	"discord_username" text,
	"linked_at" timestamp DEFAULT now() NOT NULL,
	"last_verified_at" timestamp,
	CONSTRAINT "discord_links_discord_user_id_unique" UNIQUE("discord_user_id"),
	CONSTRAINT "discord_links_desperse_user_id_unique" UNIQUE("desperse_user_id")
);
--> statement-breakpoint
CREATE TABLE "discord_member_roles" (
	"discord_user_id" text PRIMARY KEY NOT NULL,
	"has_holder_role" boolean DEFAULT false NOT NULL,
	"factions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"empty_cycles" integer DEFAULT 0 NOT NULL,
	"last_checked_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discord_verification_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discord_user_id" text NOT NULL,
	"nonce" text NOT NULL,
	"status" "discord_verification_status_enum" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "discord_verification_sessions_nonce_unique" UNIQUE("nonce")
);
--> statement-breakpoint
CREATE TABLE "discord_verified_wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discord_user_id" text NOT NULL,
	"wallet_pubkey" text NOT NULL,
	"proved_at" timestamp DEFAULT now() NOT NULL,
	"last_verified_at" timestamp,
	CONSTRAINT "discord_verified_wallets_wallet_unique" UNIQUE("wallet_pubkey")
);
--> statement-breakpoint
ALTER TABLE "discord_links" ADD CONSTRAINT "discord_links_desperse_user_id_users_id_fk" FOREIGN KEY ("desperse_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_member_roles" ADD CONSTRAINT "discord_member_roles_discord_user_id_discord_links_discord_user_id_fk" FOREIGN KEY ("discord_user_id") REFERENCES "public"."discord_links"("discord_user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_verified_wallets" ADD CONSTRAINT "discord_verified_wallets_discord_user_id_discord_links_discord_user_id_fk" FOREIGN KEY ("discord_user_id") REFERENCES "public"."discord_links"("discord_user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discord_audit_log_discord_user_id_idx" ON "discord_audit_log" USING btree ("discord_user_id");--> statement-breakpoint
CREATE INDEX "discord_audit_log_created_at_idx" ON "discord_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "discord_links_desperse_user_id_idx" ON "discord_links" USING btree ("desperse_user_id");--> statement-breakpoint
CREATE INDEX "discord_verification_sessions_discord_user_id_idx" ON "discord_verification_sessions" USING btree ("discord_user_id");--> statement-breakpoint
CREATE INDEX "discord_verification_sessions_status_expires_idx" ON "discord_verification_sessions" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "discord_verified_wallets_discord_user_id_idx" ON "discord_verified_wallets" USING btree ("discord_user_id");
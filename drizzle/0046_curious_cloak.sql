CREATE TABLE "leaderboard_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rank" integer NOT NULL,
	"score" integer NOT NULL,
	"paid_edition_count" integer DEFAULT 0 NOT NULL,
	"free_collect_count" integer DEFAULT 0 NOT NULL,
	"unique_supporter_count" integer DEFAULT 0 NOT NULL,
	"net_new_follower_count" integer DEFAULT 0 NOT NULL,
	"activated_referral_count" integer DEFAULT 0 NOT NULL,
	"recent_post_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"view" text NOT NULL,
	"period" text NOT NULL,
	"category" text DEFAULT 'all' NOT NULL,
	"algorithm_version" text NOT NULL,
	"bucket_started_at" timestamp with time zone NOT NULL,
	"entry_count" integer DEFAULT 0 NOT NULL,
	"is_complete" boolean DEFAULT false NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_moderation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_user_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"report_id" uuid,
	"previous_status" text NOT NULL,
	"next_status" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_snapshot_id_leaderboard_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."leaderboard_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_recent_post_id_posts_id_fk" FOREIGN KEY ("recent_post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_moderation_actions" ADD CONSTRAINT "user_moderation_actions_subject_user_id_users_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_moderation_actions" ADD CONSTRAINT "user_moderation_actions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_moderation_actions" ADD CONSTRAINT "user_moderation_actions_report_id_content_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."content_reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "leaderboard_entries_snapshot_user_unique_idx" ON "leaderboard_entries" USING btree ("snapshot_id","user_id");--> statement-breakpoint
CREATE INDEX "leaderboard_entries_snapshot_rank_idx" ON "leaderboard_entries" USING btree ("snapshot_id","rank");--> statement-breakpoint
CREATE INDEX "leaderboard_entries_user_id_idx" ON "leaderboard_entries" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "leaderboard_snapshots_scope_bucket_unique_idx" ON "leaderboard_snapshots" USING btree ("view","period","category","algorithm_version","bucket_started_at");--> statement-breakpoint
CREATE INDEX "leaderboard_snapshots_scope_generated_idx" ON "leaderboard_snapshots" USING btree ("view","period","category","is_complete","generated_at");--> statement-breakpoint
CREATE INDEX "user_moderation_actions_subject_created_idx" ON "user_moderation_actions" USING btree ("subject_user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_moderation_actions_actor_created_idx" ON "user_moderation_actions" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "collections_leaderboard_confirmed_idx" ON "collections" USING btree ("status","created_at","post_id");--> statement-breakpoint
CREATE INDEX "follows_leaderboard_created_idx" ON "follows" USING btree ("created_at","following_id");--> statement-breakpoint
CREATE INDEX "purchases_leaderboard_confirmed_idx" ON "purchases" USING btree ("status","mint_confirmed_at","post_id");--> statement-breakpoint
CREATE INDEX "referrals_leaderboard_activated_idx" ON "referrals" USING btree ("state","activated_at","referrer_user_id");
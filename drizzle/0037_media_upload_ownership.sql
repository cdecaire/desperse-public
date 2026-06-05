CREATE TABLE "media_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"url" text NOT NULL,
	"pathname" text,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"media_type" text NOT NULL,
	"file_size" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "signup_ip" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "signup_country" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "signup_user_agent" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "signup_method" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "flagged_reason" text;--> statement-breakpoint
ALTER TABLE "media_uploads" ADD CONSTRAINT "media_uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_uploads_user_id_idx" ON "media_uploads" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_uploads_url_idx" ON "media_uploads" USING btree ("url");--> statement-breakpoint
CREATE UNIQUE INDEX "user_blocks_blocker_blocked_unique_idx" ON "user_blocks" USING btree ("blocker_id","blocked_id");--> statement-breakpoint
CREATE INDEX "user_blocks_blocker_id_idx" ON "user_blocks" USING btree ("blocker_id");--> statement-breakpoint
CREATE INDEX "user_blocks_blocked_id_idx" ON "user_blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE INDEX "users_signup_ip_idx" ON "users" USING btree ("signup_ip");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");
CREATE TYPE "public"."content_type_enum" AS ENUM('post', 'comment');--> statement-breakpoint
CREATE TYPE "public"."report_resolution_enum" AS ENUM('removed', 'no_action');--> statement-breakpoint
CREATE TYPE "public"."report_status_enum" AS ENUM('open', 'reviewing', 'resolved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_role_enum" AS ENUM('user', 'moderator', 'admin');--> statement-breakpoint
CREATE TABLE "content_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type" "content_type_enum" NOT NULL,
	"content_id" uuid NOT NULL,
	"reported_by_user_id" uuid NOT NULL,
	"reasons" text[] NOT NULL,
	"details" text,
	"status" "report_status_enum" DEFAULT 'open' NOT NULL,
	"resolution" "report_resolution_enum",
	"resolved_by_user_id" uuid,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "hidden_at" timestamp;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "hidden_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "report_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "deleted_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "delete_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role_enum" DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reported_by_user_id_users_id_fk" FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_reports_content_user_unique_idx" ON "content_reports" USING btree ("content_type","content_id","reported_by_user_id");--> statement-breakpoint
CREATE INDEX "content_reports_status_created_idx" ON "content_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "content_reports_content_idx" ON "content_reports" USING btree ("content_type","content_id");--> statement-breakpoint
CREATE INDEX "content_reports_reported_by_user_id_idx" ON "content_reports" USING btree ("reported_by_user_id");--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_hidden_by_user_id_users_id_fk" FOREIGN KEY ("hidden_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_deleted_by_user_id_users_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
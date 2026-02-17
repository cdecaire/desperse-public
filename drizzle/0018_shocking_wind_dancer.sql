CREATE TYPE "public"."feedback_status_enum" AS ENUM('new', 'reviewed');--> statement-breakpoint
CREATE TABLE "beta_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" text,
	"rating" integer,
	"message" text,
	"image_url" text,
	"page_url" text,
	"app_version" text,
	"user_agent" text,
	"status" "feedback_status_enum" DEFAULT 'new' NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rating_range_check" CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
);
--> statement-breakpoint
ALTER TABLE "beta_feedback" ADD CONSTRAINT "beta_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beta_feedback" ADD CONSTRAINT "beta_feedback_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "beta_feedback_user_id_idx" ON "beta_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "beta_feedback_status_created_idx" ON "beta_feedback" USING btree ("status","created_at");
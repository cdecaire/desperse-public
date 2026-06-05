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
ALTER TABLE "media_uploads" ADD CONSTRAINT "media_uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_uploads_user_id_idx" ON "media_uploads" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_uploads_url_idx" ON "media_uploads" USING btree ("url");
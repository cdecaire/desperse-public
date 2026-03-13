CREATE TABLE "creator_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"copyright_license_preset" text,
	"copyright_license_custom" text,
	"copyright_holder" text,
	"copyright_rights" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creator_settings" ADD CONSTRAINT "creator_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "creator_settings_user_id_unique_idx" ON "creator_settings" USING btree ("user_id");
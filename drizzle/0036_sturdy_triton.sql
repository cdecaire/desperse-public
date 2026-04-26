CREATE TABLE "preservation_signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"eth_address" text,
	"email" text,
	"source" text DEFAULT 'foundation_preservation' NOT NULL,
	"catalog_snapshot" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "preservation_signups_eth_source_unique" UNIQUE("eth_address","source"),
	CONSTRAINT "preservation_signups_email_source_unique" UNIQUE("email","source")
);
--> statement-breakpoint
ALTER TABLE "push_tokens" ADD COLUMN "environment" text;--> statement-breakpoint
ALTER TABLE "preservation_signups" ADD CONSTRAINT "preservation_signups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "preservation_signups_user_id_idx" ON "preservation_signups" USING btree ("user_id");
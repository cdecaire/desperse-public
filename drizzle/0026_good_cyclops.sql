CREATE TYPE "public"."tip_status_enum" AS ENUM('pending', 'confirmed', 'failed');--> statement-breakpoint
CREATE TABLE "tips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"token_mint" text NOT NULL,
	"tx_signature" text,
	"status" "tip_status_enum" DEFAULT 'pending' NOT NULL,
	"context" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "tips" ADD CONSTRAINT "tips_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tips" ADD CONSTRAINT "tips_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tips_from_user_id_idx" ON "tips" USING btree ("from_user_id");--> statement-breakpoint
CREATE INDEX "tips_to_user_id_idx" ON "tips" USING btree ("to_user_id");--> statement-breakpoint
CREATE INDEX "tips_status_idx" ON "tips" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tips_from_to_status_idx" ON "tips" USING btree ("from_user_id","to_user_id","status");--> statement-breakpoint
CREATE INDEX "tips_tx_signature_idx" ON "tips" USING btree ("tx_signature");
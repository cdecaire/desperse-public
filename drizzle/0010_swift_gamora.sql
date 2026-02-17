ALTER TABLE "posts" ADD COLUMN "minted_at" timestamp;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "minted_tx_signature" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "minted_metadata_uri" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "minted_metadata_json" jsonb;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "minted_is_mutable" boolean;
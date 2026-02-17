ALTER TABLE "posts" ADD COLUMN "last_onchain_sync_at" timestamp;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "onchain_sync_status" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "last_onchain_tx_signature" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "master_tx_signature" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "print_tx_signature" text;
ALTER TABLE "purchases" ADD COLUMN "fulfillment_key" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "fulfillment_claimed_at" timestamp;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "payment_confirmed_at" timestamp;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "minting_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "mint_confirmed_at" timestamp;--> statement-breakpoint
CREATE INDEX "purchases_fulfillment_key_idx" ON "purchases" USING btree ("fulfillment_key");--> statement-breakpoint
-- Data migration: Copy existing confirmed_at to payment_confirmed_at for records where nft_mint is set
-- (these had both payment and mint confirmed)
UPDATE "purchases" SET "payment_confirmed_at" = "confirmed_at" WHERE "confirmed_at" IS NOT NULL;--> statement-breakpoint
-- For fully confirmed purchases (with nft_mint), also set mint_confirmed_at
UPDATE "purchases" SET "mint_confirmed_at" = "confirmed_at" WHERE "confirmed_at" IS NOT NULL AND "nft_mint" IS NOT NULL;
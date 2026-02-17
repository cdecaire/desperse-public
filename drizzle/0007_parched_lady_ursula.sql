ALTER TABLE "purchases" ALTER COLUMN "nft_mint" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "reserved_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "submitted_at" timestamp;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "confirmed_at" timestamp;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "failed_at" timestamp;--> statement-breakpoint
-- Migrate existing 'pending' records: if they have txSignature, mark as 'submitted', otherwise 'reserved'
UPDATE "purchases" SET "status" = CASE WHEN "tx_signature" IS NOT NULL THEN 'submitted' ELSE 'reserved' END, "reserved_at" = COALESCE("created_at", now()) WHERE "status" = 'pending';--> statement-breakpoint
UPDATE "purchases" SET "submitted_at" = "created_at" WHERE "status" = 'submitted' AND "tx_signature" IS NOT NULL AND "submitted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "purchases" ALTER COLUMN "status" SET DEFAULT 'reserved';--> statement-breakpoint
ALTER TABLE "purchases" ALTER COLUMN "reserved_at" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "purchases_status_idx" ON "purchases" USING btree ("status");
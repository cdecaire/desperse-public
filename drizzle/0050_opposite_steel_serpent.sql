DROP INDEX "tips_tx_signature_idx";--> statement-breakpoint
ALTER TABLE "tips" ADD COLUMN "from_wallet_address" text;--> statement-breakpoint
ALTER TABLE "tips" ADD COLUMN "to_wallet_address" text;--> statement-breakpoint
ALTER TABLE "tips" ADD COLUMN "source_token_account" text;--> statement-breakpoint
ALTER TABLE "tips" ADD COLUMN "destination_token_account" text;--> statement-breakpoint
ALTER TABLE "tips" ADD COLUMN "token_program" text;--> statement-breakpoint
ALTER TABLE "tips" ADD COLUMN "token_decimals" integer;--> statement-breakpoint
ALTER TABLE "tips" ADD COLUMN "prepared_blockhash" text;--> statement-breakpoint
ALTER TABLE "tips" ADD COLUMN "last_valid_block_height" bigint;--> statement-breakpoint
ALTER TABLE "tips" ADD COLUMN "prepared_message_hash" text;--> statement-breakpoint
ALTER TABLE "tips" ADD COLUMN "verification_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tips" ADD COLUMN "signature_submitted_at" timestamp;--> statement-breakpoint
ALTER TABLE "tips" ADD COLUMN "verification_claim_key" text;--> statement-breakpoint
ALTER TABLE "tips" ADD COLUMN "verification_claimed_at" timestamp;--> statement-breakpoint
ALTER TABLE "tips" ADD COLUMN "verification_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tips" ADD COLUMN "last_verification_code" text;--> statement-breakpoint
ALTER TABLE "tips" ADD COLUMN "failed_at" timestamp;--> statement-breakpoint
WITH duplicate_signatures AS (
	SELECT "tx_signature"
	FROM "tips"
	WHERE "tx_signature" IS NOT NULL
	GROUP BY "tx_signature"
	HAVING COUNT(*) > 1
)
UPDATE "tips"
SET "status" = 'failed',
	"failed_at" = NOW(),
	"last_verification_code" = 'legacy_signature_collision',
	"tx_signature" = NULL
WHERE "tx_signature" IN (SELECT "tx_signature" FROM duplicate_signatures);--> statement-breakpoint
UPDATE "tips"
SET "status" = 'failed',
	"failed_at" = NOW(),
	"last_verification_code" = 'legacy_unverifiable'
WHERE "status" = 'pending' AND "verification_version" = 0;--> statement-breakpoint
CREATE UNIQUE INDEX "tips_tx_signature_unique_idx" ON "tips" USING btree ("tx_signature") WHERE "tips"."tx_signature" is not null;--> statement-breakpoint
ALTER TABLE "tips" ADD CONSTRAINT "tips_version_one_snapshot_check" CHECK ("tips"."verification_version" <> 1 OR ("tips"."from_wallet_address" IS NOT NULL AND "tips"."to_wallet_address" IS NOT NULL AND "tips"."source_token_account" IS NOT NULL AND "tips"."destination_token_account" IS NOT NULL AND "tips"."token_mint" IS NOT NULL AND "tips"."token_program" IS NOT NULL AND "tips"."token_decimals" IS NOT NULL AND "tips"."prepared_blockhash" IS NOT NULL AND "tips"."last_valid_block_height" IS NOT NULL AND "tips"."prepared_message_hash" IS NOT NULL));
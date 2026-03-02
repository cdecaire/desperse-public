CREATE TABLE "creator_storage_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_address" text NOT NULL,
	"turbo_shared_winc" bigint DEFAULT 0,
	"turbo_approval_expires_at" timestamp with time zone,
	"last_top_up_at" timestamp with time zone,
	"last_top_up_amount_sol" numeric,
	"last_balance_check_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_storage_balances_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
DROP INDEX "posts_filtered_feed_idx";--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "storage_type" text DEFAULT 'centralized' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "arweave_status" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "arweave_media_tx_id" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "arweave_metadata_tx_id" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "arweave_error" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "is_dev" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "creator_storage_balances" ADD CONSTRAINT "creator_storage_balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "creator_storage_balances_user_id_idx" ON "creator_storage_balances" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "creator_storage_balances_wallet_address_idx" ON "creator_storage_balances" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "posts_filtered_feed_idx" ON "posts" USING btree ("is_dev","is_deleted","is_hidden","created_at");
CREATE TABLE "pfp_mints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_address" text NOT NULL,
	"nft_mint_address" text,
	"tx_signature" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"network" text DEFAULT 'devnet' NOT NULL,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "pfp_mints" ADD CONSTRAINT "pfp_mints_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pfp_mints_user_id_idx" ON "pfp_mints" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pfp_mints_wallet_address_idx" ON "pfp_mints" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "pfp_mints_status_idx" ON "pfp_mints" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pfp_mints_network_idx" ON "pfp_mints" USING btree ("network");--> statement-breakpoint
CREATE INDEX "pfp_mints_tx_signature_idx" ON "pfp_mints" USING btree ("tx_signature");
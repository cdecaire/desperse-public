ALTER TABLE "posts" ADD COLUMN "nft_name" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "nft_symbol" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "nft_description" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "seller_fee_basis_points" integer;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "is_mutable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "collection_address" text;
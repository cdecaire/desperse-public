CREATE TYPE "public"."asset_role_enum" AS ENUM('media', 'download');--> statement-breakpoint
ALTER TABLE "post_assets" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "post_assets" ADD COLUMN "role" "asset_role_enum" DEFAULT 'media' NOT NULL;--> statement-breakpoint
ALTER TABLE "post_assets" ADD COLUMN "is_previewable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX "post_assets_post_sort_idx" ON "post_assets" USING btree ("post_id","sort_order");--> statement-breakpoint
CREATE INDEX "post_assets_post_role_sort_idx" ON "post_assets" USING btree ("post_id","role","sort_order");